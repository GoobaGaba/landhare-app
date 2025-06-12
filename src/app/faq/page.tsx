
// THIS IS A TEMPORARY, MINIMAL VERSION FOR DEBUGGING BUILD ISSUES.

export default function FaqPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">Frequently Asked Questions</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about LandShare.
        </p>
      </header>

      <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-4">
        <div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              What is LandShare? (Static)
            </h3>
            <p className="text-muted-foreground">
              LandShare is a platform. (Static answer)
            </p>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              How do I find land? (Static)
            </h3>
            <p className="text-muted-foreground">
              Use our search page. (Static answer)
            </p>
        </div>
      </div>
    </div>
  );
}
