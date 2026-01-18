const features = [
  {
    emoji: '📚',
    title: 'Stack Your Pieces',
    description: 'Land on your own pieces to build powerful stacks. The taller the stack, the stronger your position.',
  },
  {
    emoji: '🎯',
    title: 'Strategic Movement',
    description: 'Stack height changes everything. Move distance = dice roll ÷ stack height. Bigger stacks move slower but hit harder.',
  },
  {
    emoji: '⚔️',
    title: 'Capture Enemies',
    description: 'Land on opponent stacks with equal or greater height to capture them all. One move can change the game.',
  },
  {
    emoji: '🦘',
    title: 'Hop & Capture',
    description: 'Jump over enemy stacks to land exactly on them. Master the hop to surprise your opponents.',
  },
]

export function Features() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          What Makes It Different
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
            >
              <div className="text-3xl mb-3">{feature.emoji}</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
