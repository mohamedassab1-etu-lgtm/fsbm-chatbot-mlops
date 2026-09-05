import { useState } from 'react';

type ReportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string | null;
    messageId: string | number | null;
    isStopped: boolean;
    onReportSuccess: (id: string | number) => void;
};

const REPORT_TAGS = [
    "Wrong answer",
    "Takes too long to answer",
    "Information not exists",
    "Other"
];

export function ReportModal({ isOpen, onClose, conversationId, messageId, isStopped, onReportSuccess }: ReportModalProps) {
    const [text, setText] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const maxLength = 500;

    if (!isOpen || !messageId || !conversationId) return null;

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleClose = () => {
        setText("");
        setSelectedTags([]);
        onClose();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    tags: selectedTags,
                    conversationId,
                    messageId,
                    isStopped
                })
            });
            onReportSuccess(messageId); // Modifie l'interface instantanément
            handleClose();
        } catch (error) {
            console.error("Erreur d'envoi", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e1f20] border border-[#3c3f41] rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between px-5 py-4 border-b border-[#3c3f41]">
                    <h2 className="text-[#e3e3e3] font-medium text-[15px]">Report response</h2>
                    <button onClick={handleClose} className="text-[#8e918f] hover:text-[#e3e3e3] transition-colors cursor-pointer">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <span className="text-[13px] text-[#c4c7c5]">What went wrong? Select all that apply:</span>

                    <div className="flex flex-wrap gap-2">
                        {REPORT_TAGS.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border cursor-pointer ${selectedTags.includes(tag)
                                        ? 'bg-[#a8c7fa] text-[#062e6f] border-[#a8c7fa]'
                                        : 'bg-transparent text-[#e3e3e3] border-[#3c3f41] hover:bg-[#282a2c]'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    <div className="relative mt-2">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={maxLength}
                            placeholder="Tell us more about the issue (optional)..."
                            className="w-full bg-[#131314] text-[#e3e3e3] text-[13px] rounded-xl border border-[#3c3f41] p-3 pb-8 h-32 resize-none focus:outline-none focus:border-[#a8c7fa] transition-colors"
                        />
                        <div className="absolute bottom-3 right-3 text-[11px] font-medium text-[#8e918f]">
                            {text.length}/{maxLength}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 bg-[#131314] border-t border-[#3c3f41]">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-full text-[13px] font-medium text-[#e3e3e3] hover:bg-[#282a2c] transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (text.trim().length === 0 && selectedTags.length === 0)}
                        className="px-4 py-2 rounded-full text-[13px] font-medium bg-[#a8c7fa] text-[#062e6f] hover:bg-[#b5d0fc] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Submitting..." : "Submit report"}
                    </button>
                </div>
            </div>
        </div>
    );
}