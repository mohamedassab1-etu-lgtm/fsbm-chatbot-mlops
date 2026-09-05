// On importe TON client Prisma déjà configuré au lieu d'en créer un nouveau !
import { prisma } from '../src/lib/prisma';

async function main() {
    // 1. Trouver l'utilisateur (on prend le premier qui existe, donc toi !)
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error("❌ Aucun utilisateur trouvé. Connecte-toi au moins une fois sur le site avant de lancer le seeder.");
        return;
    }

    console.log(`🚀 Démarrage du Seeding pour l'utilisateur : ${user.email}`);

    // 2. Définition de fausses données (Mock Data) pour éviter les appels LLM
    const topics = [
        "React Native vs Expo", "Machine Learning Optimization", "Next.js App Router Tutorial",
        "Moroccan Startup Ideas", "Rocket League Mechanics", "FastAPI vs Flask",
        "Docker Containerization", "Kubernetes Clustering", "Solidity Smart Contracts",
        "Big Data Processing", "Scrum Master Daily Routine", "Q-Learning Algorithm",
        "Database Architecture", "Tailwind CSS Tricks", "Cloud Infrastructure"
    ];

    const mockQA = [
        { q: "Can you explain this concept simply?", a: "Absolutely! The concept revolves around separating concerns. You have your frontend handling the UI, and the backend managing logic and databases." },
        { q: "What are the main advantages?", a: "There are three main benefits:\n1. Better performance\n2. Easier maintenance\n3. Scalability." },
        { q: "Could you give me a code example?", a: "Sure, here is a quick snippet:\n\n```python\ndef hello_world():\n    print('Hello')\n```\n\nHope this helps!" },
        { q: "Is there an alternative to this method?", a: "Yes, you could use alternative libraries, but the standard approach is highly recommended for long-term support." },
        { q: "How do I deploy this to production?", a: "To deploy, you generally want to containerize the app using Docker, then host it on a service like AWS, Azure, or Vercel depending on the stack." },
        { q: "What about the security aspects?", a: "Security is crucial. Always validate user inputs, use HTTPS, and never expose your private API keys in the client-side code." }
    ];

    // 3. Boucle de création massive (15 conversations)
    for (let i = 0; i < 15; i++) {
        // Étale les dates de création pour que l'historique soit réaliste
        const baseDate = new Date(Date.now() - i * 86400000); // Recule d'un jour à chaque conversation

        const conversation = await prisma.conversation.create({
            data: {
                title: topics[i % topics.length],
                userId: user.id,
                isPinned: i < 2, // Épingle les 2 premières pour tester
                createdAt: baseDate,
                updatedAt: baseDate,
            }
        });

        // Entre 4 et 8 paires de questions/réponses par conversation (soit 8 à 16 messages)
        const numPairs = Math.floor(Math.random() * 5) + 4;

        for (let j = 0; j < numPairs; j++) {
            const qa = mockQA[j % mockQA.length];
            const messageTime = new Date(baseDate.getTime() + j * 60000); // Ajoute 1 minute par message

            // Message de l'utilisateur
            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    sender: "user",
                    text: qa.q,
                    createdAt: messageTime,
                }
            });

            // Logique du 10% arrêté (Stopped)
            const isStopped = Math.random() < 0.10; // 10% de chance d'être coupé
            // Si c'est coupé, on ne prend que la moitié du texte et on ajoute des points de suspension
            const botText = isStopped ? qa.a.substring(0, Math.floor(qa.a.length / 2)) + "..." : qa.a;

            // Message du bot
            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    sender: "bot",
                    text: botText,
                    isStopped: isStopped,
                    createdAt: new Date(messageTime.getTime() + 5000), // Le bot répond 5 secondes après
                }
            });
        }
        process.stdout.write(`✅ Conversation ${i + 1}/15 créée...\r`);
    }

    console.log("\n🎉 Seeding terminé avec succès ! Ton interface est maintenant remplie.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });