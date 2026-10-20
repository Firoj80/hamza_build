import Image from 'next/image';
import Link from 'next/link';

type Props = { href?: string; className?: string; icon?: boolean; back?: boolean };

export default function BrandMark({ href = '/', className = '', icon = false, back = false }: Props) {
  return <Link href={href} className={`brand-mark ${className}`.trim()} aria-label="Hamza Idrishi, Build_hamza">
    {back && <span className="brand-back" aria-hidden="true">←</span>}
    {icon && <Image className="brand-icon" src="/icon.svg" alt="" width={33} height={33} unoptimized/>}
    <span className="brand-copy"><span>Hamza Idrishi</span><small>Build_hamza</small></span>
  </Link>;
}
