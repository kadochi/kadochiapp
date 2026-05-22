import Header from "@/components/layout/Header/Header";
import StaticPage, {
  PageTitle,
  Paragraph,
  SectionHeader,
} from "@/components/layout/StaticPage/StaticPage";

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
