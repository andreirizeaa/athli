export default function DownloadClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          body {
            background-color: #272727 !important;
          }
        `
      }} />
      {children}
    </>
  );
}
