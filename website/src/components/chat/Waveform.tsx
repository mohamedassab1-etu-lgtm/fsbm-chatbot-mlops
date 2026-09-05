type WaveformProps = {
    levels: number[];
};

export function Waveform({ levels }: WaveformProps) {
    return (
        <div className="flex items-end gap-[2px] h-4 shrink-0 px-1.5">
            {levels.map((h, i) => (
                <span
                    key={i}
                    className="w-[2px] bg-[#8ab4f8] rounded-full transition-[height] duration-75"
                    style={{ height: `${h}px` }}
                ></span>
            ))}
        </div>
    );
}