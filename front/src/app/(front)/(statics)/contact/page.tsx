import type { Metadata } from "next";
import Header from "@/components/layout/Header/Header";
import StaticPage, {
  PageTitle,
  Paragraph,
  SectionHeader,
} from "@/components/layout/StaticPage/StaticPage";

export const metadata: Metadata = {
  title: "تماس با ما",
  description:
    "راه‌های ارتباط با کادوچی؛ شماره تماس ۰۲۱ ۸۸۴۵۵۵۵۴، ایمیل info@kadochi.com و آدرس دفتر در تهران، خیابان شریعتی.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "تماس با ما | کادوچی",
    description:
      "برای پشتیبانی و سوالات با کادوچی تماس بگیرید؛ تلفن، ایمیل و آدرس دفتر مرکزی.",
    url: "/contact",
  },
  twitter: {
    title: "تماس با ما | کادوچی",
    description:
      "اطلاعات تماس کادوچی؛ پشتیبانی تلفنی، ایمیل و آدرس دفتر در تهران.",
  },
};

export default function ContactPage() {
  return (
    <>
      <Header variant="internal" title="تماس با ما" backUrl="/" />

      <StaticPage>
        <PageTitle>تماس با ما</PageTitle>

        <SectionHeader>شماره تماس</SectionHeader>
        <Paragraph>۰۲۱ ۸۸۴۵۵۵۵۴</Paragraph>

        <SectionHeader>ایمیل</SectionHeader>
        <Paragraph>info@kadochi.com</Paragraph>

        <SectionHeader>آدرس</SectionHeader>
        <Paragraph>تهران، خیابان شریعتی، کوچه استاد مینوی، پلاک ۱۸</Paragraph>
      </StaticPage>
    </>
  );
}
