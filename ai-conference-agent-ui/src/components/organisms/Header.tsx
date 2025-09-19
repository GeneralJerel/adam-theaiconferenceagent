import Badge from '../atoms/Badge'
import Button from '../atoms/Button'

type Props = { onTryNow?: () => void; onBrandClick?: () => void }

export default function Header({ onTryNow, onBrandClick }: Props) {
  return (
    <div className="header">
      <div className="brand" onClick={onBrandClick}>
        <span>Adam</span>
        <Badge>BETA</Badge>
      </div>
      <Button variant="ghost" onClick={onTryNow}>Try now</Button>
    </div>
  )
}


