export default function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} LandShare Connect. All rights reserved.</p>
        <p className="mt-1">Disrupting housing, one plot at a time.</p>
      </div>
    </footer>
  );
}
