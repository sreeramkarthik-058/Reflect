function renderInline(text, prefix = '') {
  const parts = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0, m, k = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={`${prefix}t${k++}`}>{text.slice(last, m.index)}</span>)
    if (m[0].startsWith('**')) {
      parts.push(<strong key={`${prefix}b${k++}`} className="font-semibold text-text">{m[1]}</strong>)
    } else {
      parts.push(<em key={`${prefix}i${k++}`}>{m[2]}</em>)
    }
    last = regex.lastIndex
  }
  if (last < text.length) parts.push(<span key={`${prefix}t${k++}`}>{text.slice(last)}</span>)
  return parts
}

function renderBlock(block, bi) {
  const rawLines = block.split('\n')
  const segments = []
  let current = null

  for (const line of rawLines) {
    const isBullet = /^[-*]\s/.test(line)
    const type = isBullet ? 'list' : 'text'
    if (!current || current.type !== type) {
      current = { type, lines: [], items: [] }
      segments.push(current)
    }
    if (isBullet) current.items.push(line.replace(/^[-*]\s/, ''))
    else current.lines.push(line)
  }

  return (
    <div key={bi} className={bi > 0 ? 'mt-2' : ''}>
      {segments.map((seg, si) => {
        if (seg.type === 'list') {
          return (
            <ul key={si} className={`list-disc list-inside space-y-0.5 ${si > 0 ? 'mt-1' : ''}`}>
              {seg.items.map((item, ii) => (
                <li key={ii}>{renderInline(item, `${bi}-${si}-${ii}-`)}</li>
              ))}
            </ul>
          )
        }
        const nonEmpty = seg.lines.filter(l => l.trim() !== '')
        if (nonEmpty.length === 0) return null
        return (
          <p key={si} className={si > 0 ? 'mt-1' : ''}>
            {nonEmpty.map((line, li) => (
              <span key={li}>
                {renderInline(line, `${bi}-${si}-${li}-`)}
                {li < nonEmpty.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export function renderMarkdown(text) {
  if (!text) return null
  const blocks = text.trim().split(/\n{2,}/)
  return blocks.map((block, bi) => renderBlock(block, bi))
}
