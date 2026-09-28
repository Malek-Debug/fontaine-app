export default function ProjectorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-neutral-900">
      {children}
    </div>
  );
}
