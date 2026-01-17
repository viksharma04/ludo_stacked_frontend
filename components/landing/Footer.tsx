export function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Enjoying Ludo Stacked?{' '}
          <a
            href="https://buymeacoffee.com/ludostacked"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-medium"
          >
            Buy me a coffee ☕
          </a>
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-4">
          © {new Date().getFullYear()} Ludo Stacked. A strategic twist on a classic game.
        </p>
      </div>
    </footer>
  )
}
