type ToastProps = {
    show: boolean;
    message?: string;
};

export function Toast({ show, message = "Copied to clipboard" }: ToastProps) {
    if (!show) return null;

    return (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-[#282a2c] text-[#e3e3e3] text-[14px] px-4 py-3 rounded-2xl shadow-lg border border-[#333538] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#81c995] shrink-0">
                <polyline points="20 6 9 17 4 12" />
            </svg>
            {message}
        </div>
    );
}