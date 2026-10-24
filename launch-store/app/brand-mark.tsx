import Image from 'next/image';
import Link from 'next/link';

type Props = { href?: string; className?: string; icon?: boolean; back?: boolean };

export default function BrandMark({ href = '/', className = '', icon = false, back = false }: Props) {
  return <Link href={href} className={`brand-mark ${className}`.trim()} aria-label="Hamza Idrishi, Build_hamza">
    {back && <span className="brand-back" aria-hidden="true">←</span>}
    {icon && <Image className="brand-icon" src="/assets/aistudio/ik_Vm6tn_d1cf175a.jpg" alt="Hamza Idrishi" width={36} height={36} unoptimized/>}
    <span className="brand-copy"><span>Hamza Idrishi</span><small>Build_hamza</small></span>
  </Link>;
}
