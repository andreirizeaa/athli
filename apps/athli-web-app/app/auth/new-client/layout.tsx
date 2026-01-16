export default function NewClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          body {
            background-color: #09090b !important;
          }
        `
      }} />
      {children}
    </>
  );
}
