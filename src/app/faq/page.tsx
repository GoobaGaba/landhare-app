
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, User, Home, DollarSign, Search, type LucideIcon } from "lucide-react"; // Keep imports for now, but won't use all
import Link from "next/link";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  // iconName: "HelpCircle" | "User" | "Home" | "DollarSign" | "Search"; // Removed for simplicity
};

const faqItems: FaqItem[] = [
  {
    id: "general-1",
    question: "What is LandShare?",
    answer: "LandShare is a platform that connects landowners who have unused or underutilized land with individuals or businesses looking for space. This can be for tiny homes, RVs, storage, agriculture, events, and more.",
    // iconName: "HelpCircle",
  },
  {
    id: "renter-1",
    question: "How do I find land to rent?",
    answer: "You can use our search page to browse listings. Filter by location, size, price, amenities, and lease terms to find the perfect spot. Once you find a suitable listing, you can contact the landowner or request to book directly through the platform.",
    // iconName: "Search",
  },
  {
    id: "landowner-1",
    question: "How do I list my land?",
    answer: "If you're a landowner, you can easily create a listing by clicking on the 'List Your Land' button. You'll need to provide details about your land, such as location, size, available amenities, photos, and your desired price per month. Our AI assistant can help suggest a competitive price.",
    // iconName: "Home",
  },
  {
    id: "general-2",
    question: "What are the fees involved?",
    answer: "LandShare aims for transparent pricing. Renters on our Standard (free) plan pay a small per-booking fee. Landowners on the Standard plan have a small percentage-based service fee on their earnings. Our Premium plan offers $0 booking fees for renters and significantly lower service fees for landowners, plus other benefits. Please visit our [[Pricing Page]] for full details.",
    // iconName: "DollarSign",
  },
  {
    id: "account-1",
    question: "Do I need an account to browse listings?",
    answer: "You can browse listings without an account. However, to contact landowners, request bookings, or list your own land, you will need to create a free LandShare account.",
    // iconName: "User",
  },
  {
    id: "landowner-2",
    question: "What kind of land can I list?",
    answer: "You can list various types of land, from small plots in urban areas to large rural acreages. Be sure to clearly state what the land can be used for (e.g., suitable for RVs, tiny homes, agriculture, etc.) and any local zoning regulations or restrictions that apply.",
    // iconName: "Home",
  },
];

// const iconMap: Record<FaqItem["iconName"], LucideIcon> = { // Removed for simplicity
//   HelpCircle: HelpCircle,
//   User: User,
//   Home: Home,
//   DollarSign: DollarSign,
//   Search: Search,
// };

export default function FaqPage() {

  const renderAnswerWithLinks = (answerText: string) => {
    const parts = answerText.split(/(\[\[.*?\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkText = part.substring(2, part.length - 2);
        let href = "";
        if (linkText.toLowerCase() === "pricing page") {
          href = "/pricing";
        }
        // Add more else if conditions here for other potential links

        if (href) {
          return <Link key={index} href={href} className="text-primary hover:underline">{linkText}</Link>;
        } else {
          return linkText; 
        }
      }
      return part;
    });
  };

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
        <CardContent className="p-6 md:p-8 space-y-4">
          {faqItems.map((item) => {
            // const IconComponent = iconMap[item.iconName]; // Icon rendering removed
            return (
              <div key={item.id} className="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                <h3 className="text-lg font-semibold text-primary mb-2 flex items-center">
                  {/* {IconComponent && <IconComponent className="h-5 w-5 text-accent flex-shrink-0 mr-2" />}  Icon rendering removed */}
                  {item.question}
                </h3>
                <div className="text-muted-foreground prose-sm dark:prose-invert max-w-none">
                  {renderAnswerWithLinks(item.answer)}
                </div>
              </div>
            );
          })}
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
