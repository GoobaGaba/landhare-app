
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, User, Home, DollarSign, Search } from "lucide-react";
import Link from "next/link";

const faqItems = [
  {
    id: "general-1",
    question: "What is LandShare?",
    answer: "LandShare is a platform that connects landowners who have unused or underutilized land with individuals or businesses looking for space. This can be for tiny homes, RVs, storage, agriculture, events, and more.",
    icon: HelpCircle,
  },
  {
    id: "renter-1",
    question: "How do I find land to rent?",
    answer: "You can use our search page to browse listings. Filter by location, size, price, amenities, and lease terms to find the perfect spot. Once you find a suitable listing, you can contact the landowner or request to book directly through the platform.",
    icon: Search,
  },
  {
    id: "landowner-1",
    question: "How do I list my land?",
    answer: "If you're a landowner, you can easily create a listing by clicking on the 'List Your Land' button. You'll need to provide details about your land, such as location, size, available amenities, photos, and your desired price per month. Our AI assistant can help suggest a competitive price.",
    icon: Home,
  },
  {
    id: "general-2",
    question: "What are the fees involved?",
    answer: "LandShare aims for transparent pricing. Renters on our Standard (free) plan pay a small per-booking fee. Landowners on the Standard plan have a small percentage-based service fee on their earnings. Our Premium plan offers $0 booking fees for renters and significantly lower service fees for landowners, plus other benefits. Please visit our <a href='/pricing' class='text-primary hover:underline'>Pricing Page</a> for full details.",
    icon: DollarSign,
  },
  {
    id: "account-1",
    question: "Do I need an account to browse listings?",
    answer: "You can browse listings without an account. However, to contact landowners, request bookings, or list your own land, you will need to create a free LandShare account.",
    icon: User,
  },
  {
    id: "landowner-2",
    question: "What kind of land can I list?",
    answer: "You can list various types of land, from small plots in urban areas to large rural acreages. Be sure to clearly state what the land can be used for (e.g., suitable for RVs, tiny homes, agriculture, etc.) and any local zoning regulations or restrictions that apply.",
    icon: Home,
  },
];

export default function FaqPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <header className="text-center mb-12 md:mb-16">
        <HelpCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">Frequently Asked Questions</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about LandShare. If you don't find what you're looking for, please <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
        </p>
      </header>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardContent className="p-6 md:p-8">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem value={item.id} key={item.id}>
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="font-medium">{item.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.answer }} />
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <section className="mt-16 text-center">
          <p className="text-lg text-muted-foreground">
            Still have questions?
          </p>
          <Button asChild className="mt-4">
            <Link href="/contact">Contact Support</Link>
          </Button>
      </section>
    </div>
  );
}
