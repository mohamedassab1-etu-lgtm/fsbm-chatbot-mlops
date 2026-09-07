import os

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
import asyncio
from lingua import Language, LanguageDetectorBuilder

detector = LanguageDetectorBuilder.from_languages(
    Language.ARABIC,
    Language.ENGLISH,
    Language.FRENCH
).build()

ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

title_llm = ChatOllama(
    model="qwen2.5:3b",
    base_url=ollama_url,
    temperature=0,
    cache=False,
    num_predict=50
)

retry_title_llm = ChatOllama(
    model="qwen2.5:3b",
    base_url=ollama_url,
    temperature=0.4,
    cache=False,
    num_predict=50
)

TITLE_PROMPT = ChatPromptTemplate.from_template(
    """Generate a short, natural title for the user's prompt.

LANGUAGE:
The title MUST be written in {language}.

RULES:
1. Preserve the meaning of the user's prompt.
2. Preserve complete names and named entities.
3. NEVER remove words from an institution, university, faculty,
   organization, company, place, product, or person's full name.
4. Prefer natural human-written titles over keyword lists.
5. Normally use 3 to 6 words.
6. You may use up to 8 words when necessary to preserve an important entity.
7. Return ONLY the title.
8. Do not write "Title:".
9. Do not use quotes.
10. Do not explain.

IMPORTANT:
"Faculté des Sciences Ben M'Sik" is ONE complete entity.
Never shorten it to "Sciences Ben M'Sik".

Examples:

Input: Je veux créer un site web pour gérer les étudiants.
Title: Gestion d'un site étudiants

Input: How can I fix my Python code for reading a CSV file?
Title: Fix Python CSV code

Input: أريد إنشاء تطبيق لإدارة المصاريف الشخصية.
Title: تطبيق إدارة المصاريف

Input: Comment résoudre un problème de connexion MySQL ?
Title: Résoudre connexion MySQL

Input: Qu'est-ce que le rôle de Sadik Chaouki dans la Faculté des Sciences Ben M'Sik ?
Title: Rôle Sadik Chaouki à la Faculté des Sciences Ben M'Sik

--------------------------------------------------
FINAL TASK
--------------------------------------------------

User prompt:
{message}

Target language:
{language}

{exception_instruction}

Now generate ONLY the title."""
)

async def detect_language(prompt: str) -> dict:
    """
    Detect language without using the LLM.
    """

    if not prompt or not prompt.strip():
        return {
            "detected_language": "unknown",
            "language": "French"
        }

    try:
        detected = detector.detect_language_of(prompt)

        if detected == Language.ARABIC:
            language = "Arabic"

        elif detected == Language.ENGLISH:
            language = "English"

        elif detected == Language.FRENCH:
            language = "French"

        else:
            language = "French"

        return {
            "detected_language": detected.name.lower(),
            "language": language
        }

    except Exception as e:
        print(f"[Error detecting language] {e}")

        return {
            "detected_language": "unknown",
            "language": "French"
        }

async def generate_title(
    prompt: str,
    language: str,
    exception_titles: list[str] | None = None
) -> str:

    if not prompt or not prompt.strip():
        return "Nouveau Chat"

    exception_titles = exception_titles or []

    # Normalize titles for reliable comparison
    normalized_exceptions = {
        title.strip().casefold()
        for title in exception_titles
        if title and title.strip()
    }

    # --------------------------------------------------------
    # Build exception instruction
    # --------------------------------------------------------

    if exception_titles:

        titles_text = "\n".join(
            f'- "{title}"'
            for title in exception_titles
        )

        exception_instruction = f"""
CRITICAL RESTRICTION:

These titles are ALREADY USED and are FORBIDDEN:

{titles_text}

You MUST NOT return any of them.

Your answer MUST be a NEW and DIFFERENT title.

Do NOT reproduce a forbidden title.
Do NOT return the same title with only punctuation changed.
Do NOT return the same title with capitalization changed.

Choose a different natural wording that still preserves the meaning.
"""

    else:

        exception_instruction = """
There are no forbidden titles.
Generate the best title for the user's prompt.
"""

    # --------------------------------------------------------
    # Generate
    # --------------------------------------------------------

    try:

        # Use normal model when there are no exceptions.
        # Use retry model when we are trying to avoid duplicates.
        llm = retry_title_llm if exception_titles else title_llm

        title_chain = TITLE_PROMPT | llm

        title_result = await title_chain.ainvoke({
            "language": language,
            "message": prompt,
            "exception_instruction": exception_instruction
        })

        title = title_result.content.strip()

        # Clean surrounding characters
        title = title.strip('"\'*.: ')

        # ----------------------------------------------------
        # HARD PYTHON CHECK
        # ----------------------------------------------------

        if title.casefold() in normalized_exceptions:

            print(
                f"[Title Rejected]"
                f"\n  Generated: {title}"
                f"\n  Reason: Duplicate title"
            )

            return ""

        return title if title else ""

    except Exception as e:

        print(f"[Error generating title] {e}")
        return ""

async def generate_conversation_title(
    prompt: str,
    language: str | None = None,
    exception_titles: list[str] | None = None
) -> dict:

    if not prompt or not prompt.strip():
        return {
            "title": "Nouveau Chat",
            "detected_language": "unknown",
            "target_language": "French"
        }

    exception_titles = list(exception_titles or [])

    # --------------------------------------------------------
    # STEP 1: LANGUAGE
    # --------------------------------------------------------

    if language in {"Arabic", "French", "English"}:

        target_language = language
        detected_lang_raw = language.lower()

        print(
            "\n[Language Reused]"
            f"\n  Language: {target_language}"
        )

    else:

        language_info = await detect_language(prompt)

        target_language = language_info["language"]
        detected_lang_raw = language_info["detected_language"]

        print(
            "\n[Language Detection]"
            f"\n  Raw: {detected_lang_raw}"
            f"\n  Target: {target_language}"
        )

    # --------------------------------------------------------
    # STEP 2: GENERATE UNIQUE TITLE
    # --------------------------------------------------------

    max_attempts = 5

    for attempt in range(1, max_attempts + 1):

        print(
            f"\n[Title Attempt {attempt}/{max_attempts}]"
        )

        title = await generate_title(
            prompt=prompt,
            language=target_language,
            exception_titles=exception_titles
        )

        if not title:
            continue

        # Python-side duplicate check
        normalized_title = title.strip().casefold()

        normalized_exceptions = {
            t.strip().casefold()
            for t in exception_titles
            if t and t.strip()
        }

        if normalized_title in normalized_exceptions:

            print(
                f"[Duplicate Detected]"
                f"\n  Title: {title}"
            )

            if title not in exception_titles:
                exception_titles.append(title)

            continue

        # Unique title found
        print(
            f"\n[Title Generation]"
            f"\n  Title: {title}"
            f"\n  Exceptions: {exception_titles}"
        )

        return {
            "title": title,
            "detected_language": detected_lang_raw,
            "target_language": target_language
        }

    # --------------------------------------------------------
    # ALL ATTEMPTS FAILED
    # --------------------------------------------------------

    print(
        "\n[Title Generation Failed]"
        "\n  Could not generate a unique title."
    )

    return {
        "title": "Nouveau Chat",
        "detected_language": detected_lang_raw,
        "target_language": target_language
    }

async def main():

    print(
        "Title generation bot is ready.\n"
        "Type 'quit' or 'exit' to stop.\n"
    )

    while True:

        query = input("> ")

        if query.lower().strip() in ("quit", "exit"):
            break

        if not query.strip():
            continue

        print("\nIA: ", end="", flush=True)

        answer_info = await generate_conversation_title(query)

        print(answer_info)
        print()

if __name__ == "__main__":
    asyncio.run(main())