const steps = [
  {
    number: 1,
    title: 'Create Stacks',
    description: 'Land on your own pieces to stack them up. A stack of 3 is three times as powerful.',
  },
  {
    number: 2,
    title: 'Calculate Movement',
    description: 'Roll the dice, then divide by your stack height. A stack of 2 rolling a 6 moves 3 spaces.',
  },
  {
    number: 3,
    title: 'Make Tough Choices',
    description: 'Split your stack or move together? Sometimes sacrificing mobility gives you the edge.',
  },
  {
    number: 4,
    title: 'Dominate & Win',
    description: 'Capture enemy stacks, protect your own, and race to get all your pieces home first.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                {step.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
