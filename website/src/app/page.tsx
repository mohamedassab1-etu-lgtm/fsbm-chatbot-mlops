'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDarkMode = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Extraction des données utilisateur pour le profil
  const user = session?.user;
  const isStudent = user?.email?.endsWith('@etu.univh2c.ma');
  const userFullName = user?.name || undefined;
  const userName = userFullName?.split(' ')[0]?.toUpperCase() || "GUEST";
  const profilePictureUrl = user?.image || undefined;

  const fsbmData = {
    nom_officiel: "Faculté des Sciences Ben M'Sik",
    acronyme: "FSBM",
    universite_de_rattachement: "Université Hassan II de Casablanca",
    annee_de_creation: 1984,
    doyen: "Pr. Talbi Mohammed",
    vice_doyen: "Pr. El Filali Sanaa",
    description: "La Faculté des Sciences Ben M'Sik (FSBM) est un établissement d'enseignement supérieur et de recherche scientifique. Elle offre des formations diversifiées en sciences exactes et expérimentales pour les cycles de Licence, Master et Doctorat. Elle s'engage activement dans la recherche scientifique, l'innovation technologique et l'insertion professionnelle de ses étudiants.",
    contact: {
      adresse: "Faculté des Sciences Ben M'sik, Boulevard Driss El Harti, Ben M'sik, Casablanca, Maroc",
      lien_google_maps: "https://www.google.com/maps/place/Faculty+of+Sciences+Ben+M'Sick+(FSBM-UH2C)/@33.5664308,-7.5413365,17z/data=!3m1!4b1!4m6!3m5!1s0xda633261bbe100f:0xe48b03dd8c6794a0!8m2!3d33.5664308!4d-7.5413365!16s%2Fg%2F11fzpkjwyn?entry=ttu&g_ep=EgoyMDI2MDgyNi4wIKXMDSoASAFQAw%3D%3D",
      telephone: ["+212 5 22 70 46 71", "+212 6 61 44 24 27"],
      fax: "+212 5 22 70 46 75",
      emails: {
        principal: "fsbm.contact@univh2c.ma",
        scolarite: "reclamation.fsb@univh2c.ma",
        laboratoire_intelligence_artificielle: "lias.fsbm@gmail.com"
      },
      site_web: "https://www.fsbm.ma/"
    },
    departements_inclus: [
      "Biologie",
      "Chimie",
      "Géologie",
      "Mathématiques et informatique",
      "Physique",
      "Sciences de la communication et Humanités"
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#131314] dark:text-[#e3e3e3] font-sans transition-colors duration-300 flex flex-col selection:bg-blue-500/30">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-[#131314]/80 border-b border-gray-200 dark:border-[#3c3f41] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/fsbm-assistant-logo-mini.png" alt="FSBM Logo" className="w-8 h-8 object-contain" />
              <span className="text-[18px] font-semibold tracking-tight">FSBM Assistant</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-[#282a2c] transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {!mounted ? (
                  /* INVISIBLE PLACEHOLDER FOR SERVER RENDER */
                  <div className="w-5 h-5 opacity-0" />
                ) : isDarkMode ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-400">
                    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* AUTH SECTION */}
              <div className={`transition-all duration-300 ease-out ${status === 'loading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {status !== 'authenticated' ? (
                  <button
                    onClick={() => signIn('google')}
                    className="flex items-center bg-white dark:bg-[#282a2c] hover:bg-gray-50 dark:hover:bg-[#333538] text-gray-700 dark:text-[#e3e3e3] h-10 rounded-full border border-gray-300 dark:border-[#3c3f41] transition-colors shadow-sm overflow-hidden cursor-pointer pl-1 pr-4"
                  >
                    <div className="flex items-center justify-center shrink-0 w-8 h-8">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <span className="text-[13px] font-medium ml-1 whitespace-nowrap">
                      Sign in
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center bg-white dark:bg-[#282a2c] hover:bg-gray-50 dark:hover:bg-[#333538] transition-colors border border-gray-200 dark:border-[#3c3f41] shadow-sm rounded-full h-[42px] pr-1.5 pl-1.5 cursor-default">
                    {/* AVATAR */}
                    <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                      <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br from-[#1a73e8] to-[#1557b0] flex items-center justify-center font-semibold text-[13px] text-white shadow-inner overflow-hidden ${isStudent ? 'ring-[2px] ring-[#0e355c] ring-offset-[1px] ring-offset-white dark:ring-offset-[#282a2c]' : ''}`}>
                        {profilePictureUrl ? (
                          <img src={profilePictureUrl} alt={userFullName || "User"} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : userName.charAt(0)}
                      </div>
                      {/* BADGE ÉTUDIANT */}
                      {isStudent && (
                        <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-[16px] h-[16px] rounded-full border-[1.5px] border-white dark:border-[#282a2c] bg-[#0e355c] text-white" title="FSBM Student">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* TEXTE */}
                    <div className="flex flex-col justify-center min-w-0 pl-2.5 pr-2 max-w-[120px] sm:max-w-[150px]">
                      <span className="block text-[13px] font-medium leading-tight text-gray-900 dark:text-[#e3e3e3] truncate" title={userFullName}>
                        {userFullName}
                      </span>
                      <span className="block text-[11px] text-gray-500 dark:text-[#8e918f] truncate" title={user?.email || ""}>
                        {user?.email}
                      </span>
                    </div>

                    {/* DECONNEXION */}
                    <button
                      onClick={() => signOut()}
                      className="p-1.5 text-gray-500 dark:text-[#8e918f] hover:text-[#f28b82] hover:bg-gray-100 dark:hover:bg-[#382b2b] rounded-full transition-colors cursor-pointer shrink-0 ml-1"
                      title="Sign out"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="flex flex-col items-center justify-center text-center px-4 pt-12 pb-8 w-full max-w-4xl mx-auto">
        {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-[#1a73e8]/20 text-blue-700 dark:text-[#8ab4f8] text-[13px] font-medium mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Now with Multilingual Neural Voice
        </div> */}

        {/* LOGOS ADDED HERE */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mb-8 w-full">
          <img
            src="/fsbm-logo.png"
            alt="Faculté des Sciences Ben M'Sik Logo"
            className="h-20 sm:h-28 object-contain"
          />
          <img
            src="/fsbm-asstistant-logo.png"
            alt="FSBM Assistant Logo"
            className="h-20 sm:h-28 object-contain"
          />
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-[#e3e3e3]">
          Your Academic AI Partner for <br className="hidden sm:block" />
          <span className="text-[#1a73e8] dark:text-[#8ab4f8]">Faculté des Sciences Ben M'Sik</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-[#8e918f] mb-10 max-w-2xl leading-relaxed">
          Designed exclusively for FSBM students. Access course materials, resolve administrative queries, and navigate your academic journey with an intelligent, voice-enabled assistant.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button onClick={() => router.push('/chat')} className="px-8 py-3.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[16px] font-medium rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto cursor-pointer">
            Start Chatting
          </button>
        </div>
      </header>

      {/* FEATURES SECTION */}
      <section className="py-20 bg-white dark:bg-[#1e1f20] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-[#e3e3e3]">Built for the modern student</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#3c3f41]">
              <div className="w-12 h-12 bg-blue-100 dark:bg-[#1a73e8]/20 text-blue-600 dark:text-[#8ab4f8] rounded-2xl flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Context Retrieval</h3>
              <p className="text-gray-600 dark:text-[#8e918f] text-[15px] leading-relaxed">Search through thousands of past interactions. Pin essential chats and resume exactly where you left off with our persistent session memory.</p>
            </div>
            <div className="p-8 rounded-3xl bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#3c3f41]">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Neural Voice Synthesis</h3>
              <p className="text-gray-600 dark:text-[#8e918f] text-[15px] leading-relaxed">Listen to responses on the go. Choose between male and female highly realistic Microsoft Edge neural voices tailored to your preference.</p>
            </div>
            <div className="p-8 rounded-3xl bg-gray-50 dark:bg-[#131314] border border-gray-100 dark:border-[#3c3f41]">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure @etu Accounts</h3>
              <p className="text-gray-600 dark:text-[#8e918f] text-[15px] leading-relaxed">Exclusive access using official university emails ensures a secure environment. Your data is isolated, protected, and fully yours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FACULTY INFORMATION SECTION */}
      <section className="py-20 flex-1 border-t border-gray-200 dark:border-[#3c3f41] transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-[#1e1f20] rounded-[32px] p-8 sm:p-12 shadow-sm border border-gray-200 dark:border-[#3c3f41]">
            <h2 className="text-3xl font-bold mb-4">{fsbmData.nom_officiel} ({fsbmData.acronyme})</h2>
            <h4 className="text-lg text-[#1a73e8] dark:text-[#8ab4f8] mb-8 font-medium">{fsbmData.universite_de_rattachement}</h4>

            <p className="text-gray-700 dark:text-[#c4c7c5] text-[16px] leading-relaxed mb-10">
              {fsbmData.description}
            </p>

            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-lg font-semibold mb-4 border-b border-gray-200 dark:border-[#3c3f41] pb-2">Administration</h3>
                <ul className="space-y-4">
                  <li className="flex flex-col">
                    <span className="text-[12px] text-gray-500 dark:text-[#8e918f] uppercase tracking-wider font-semibold">Doyen</span>
                    <span className="text-gray-900 dark:text-[#e3e3e3]">{fsbmData.doyen}</span>
                  </li>
                  <li className="flex flex-col">
                    <span className="text-[12px] text-gray-500 dark:text-[#8e918f] uppercase tracking-wider font-semibold">Vice Doyen</span>
                    <span className="text-gray-900 dark:text-[#e3e3e3]">{fsbmData.vice_doyen}</span>
                  </li>
                  <li className="flex flex-col">
                    <span className="text-[12px] text-gray-500 dark:text-[#8e918f] uppercase tracking-wider font-semibold">Création</span>
                    <span className="text-gray-900 dark:text-[#e3e3e3]">{fsbmData.annee_de_creation}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 border-b border-gray-200 dark:border-[#3c3f41] pb-2">Départements</h3>
                <ul className="space-y-2">
                  {fsbmData.departements_inclus.map((dept, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700 dark:text-[#c4c7c5] text-[15px]">
                      <svg className="w-4 h-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      {dept}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER / CONTACT SECTION */}
      <footer className="bg-gray-100 dark:bg-[#171717] pt-16 pb-8 border-t border-gray-200 dark:border-[#3c3f41] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Column 1 */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img src="/fsbm-assistant-logo-mini.png" alt="FSBM Logo" className="w-8 h-8 object-contain grayscale opacity-70" />
                <span className="text-[16px] font-semibold text-gray-700 dark:text-[#c4c7c5]">FSBM Assistant</span>
              </div>
              <p className="text-gray-500 dark:text-[#8e918f] text-[14px] leading-relaxed">
                Un outil conçu pour faciliter l'accès à l'information académique et administrative pour tous les étudiants de la faculté.
              </p>
              <img
                src="/fsbm-asstistant-logo.png"
                alt="FSBM Assistant Logo"
                className="h-20 sm:h-28 object-contain grayscale opacity-70 mx-auto"
              />
            </div>

            {/* Column 2 */}
            <div>
              <h4 className="text-[13px] font-bold text-gray-900 dark:text-[#e3e3e3] uppercase tracking-wider mb-6">Contact & Adresse</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-[14px] text-gray-600 dark:text-[#8e918f]">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>
                    <a href={fsbmData.contact.lien_google_maps} target="_blank" rel="noreferrer" className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">
                      {fsbmData.contact.adresse}
                    </a>
                  </span>
                </li>
                <li className="flex items-center gap-3 text-[14px] text-gray-600 dark:text-[#8e918f]">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <span>
                    {fsbmData.contact.telephone.map((tel, index) => (
                      <span key={index}>
                        <a
                          href={`tel:${tel.replace(/\s+/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors"
                        >
                          {tel}
                        </a>
                        {index !== fsbmData.contact.telephone.length - 1 ? " / " : ""}
                      </span>
                    ))}
                  </span>
                </li>
                <li className="flex items-center gap-3 text-[14px] text-gray-600 dark:text-[#8e918f]">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M12 18h.01"></path></svg>
                  <span>
                    Fax: <a href={'tel:' + fsbmData.contact.fax} target="_blank" rel="noreferrer" className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">{fsbmData.contact.fax}</a>
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <h4 className="text-[13px] font-bold text-gray-900 dark:text-[#e3e3e3] uppercase tracking-wider mb-6">Liens Utiles</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-[14px] text-gray-600 dark:text-[#8e918f]">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  <a href={fsbmData.contact.site_web} target="_blank" rel="noreferrer" className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">
                    Site Web Officiel
                  </a>
                </li>
                <li className="flex flex-col gap-1 text-[13px] text-gray-600 dark:text-[#8e918f]">
                  <span className="font-medium text-gray-700 dark:text-[#c4c7c5]">Support Principal:</span>
                  <a href={`mailto:${fsbmData.contact.emails.principal}`} className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">{fsbmData.contact.emails.principal}</a>
                </li>
                <li className="flex flex-col gap-1 text-[13px] text-gray-600 dark:text-[#8e918f]">
                  <span className="font-medium text-gray-700 dark:text-[#c4c7c5]">Scolarité:</span>
                  <a href={`mailto:${fsbmData.contact.emails.scolarite}`} className="hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">{fsbmData.contact.emails.scolarite}</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-[#3c3f41] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[13px] text-gray-500 dark:text-[#8e918f]">
              © {new Date().getFullYear()} {fsbmData.acronyme} Assistant. Développé pour {fsbmData.universite_de_rattachement}.
            </p>
            <p className="text-[13px] text-gray-500 dark:text-[#8e918f]">
              Laboratoire IA: <a href={`mailto:${fsbmData.contact.emails.laboratoire_intelligence_artificielle}`} className="hover:underline">{fsbmData.contact.emails.laboratoire_intelligence_artificielle}</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}