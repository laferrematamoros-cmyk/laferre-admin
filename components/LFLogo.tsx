import Image from 'next/image';

export default function LFLogo({ size = 32 }: { size?: number }) {
  const w = Math.round(size * 2.2);
  const h = Math.round(size * 1.1);
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: '4px 8px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        src="/logo-laferre.png"
        alt="La Ferre"
        width={w}
        height={h}
        style={{ objectFit: 'contain', display: 'block' }}
        priority
      />
    </div>
  );
}
