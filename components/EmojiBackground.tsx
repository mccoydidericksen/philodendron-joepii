'use client';

export function EmojiBackground() {
  // Plant emojis for the background grid
  const emojis = ['🪴', '🌱', '🌿', '🍃'];

  // Create a repeating pattern grid
  const gridSize = 8; // 8x8 grid of emojis
  const pattern = Array.from({ length: gridSize * gridSize }, (_, i) => {
    const emoji = emojis[i % emojis.length];
    return emoji;
  });

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none -z-10">
      <div
        className="grid w-full h-full gap-8 p-8"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {pattern.map((emoji, index) => (
          <div
            key={index}
            className="flex items-center justify-center text-4xl opacity-10 transition-opacity hover:opacity-20"
            style={{
              // Add slight rotation variation for organic feel
              transform: `rotate(${(index % 3) * 15 - 15}deg)`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
