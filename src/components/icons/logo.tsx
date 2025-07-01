import Image from 'next/image';

export function Logo(props: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="LandHare Logo"
      width={48}
      height={48}
      className={props.className}
      priority
    />
  );
}
