type SkipLinkProps = {
  targetId: string;
};

export default function SkipLink({ targetId }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed left-200 top-200 z-[1700] -translate-y-24 rounded-md bg-brand-bold px-200 py-100 text-body font-weight-semibold text-text-inverse shadow-overlay transition-transform focus:translate-y-0"
    >
      Skip to content
    </a>
  );
}
