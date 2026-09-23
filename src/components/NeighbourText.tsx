import { usePreview } from '../hooks/useApp'
import { neighbourParts } from '../lib/derive'

/** A surroundings cell with every auction plot in it turned into a quick-look link. */
export default function NeighbourText({ text }: { text: string }) {
  const { open } = usePreview()
  return (
    <>
      {neighbourParts(text).map((part, i) =>
        part.id ? (
          <button
            key={i}
            type="button"
            onClick={() => open(part.id!)}
            className="font-semibold text-teal-700 underline decoration-teal-700/40 underline-offset-2 hover:decoration-teal-700 dark:text-teal-400 dark:decoration-teal-400/40"
            aria-label={`Quick look at ${part.unit}`}
          >
            {part.text}
          </button>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
