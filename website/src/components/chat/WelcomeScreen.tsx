type WelcomeScreenProps = {
    status: 'loading' | 'authenticated' | 'unauthenticated';
    userName: string;
};

export function WelcomeScreen({ status, userName }: WelcomeScreenProps) {
    return (
        <div className="flex flex-col items-center justify-center px-4 mb-8">
            <img
                src="/fsbm-asstistant-logo.png"
                alt="FSBM Full Logo"
                className="h-20 sm:h-28 object-contain mb-6 opacity-90"
            />
            <h2
                className={`text-3xl sm:text-4xl font-medium tracking-tight bg-gradient-to-r from-[#d8d8d8] to-[#6b6b6b] bg-clip-text text-transparent transition-all duration-700 ease-out ${status === 'loading' ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
                    }`}
            >
                {status === 'authenticated' ? `What can I help with, ${userName}?` : "What can I help with?"}
            </h2>
        </div>
    );
}