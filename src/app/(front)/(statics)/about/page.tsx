import Header from "@/components/layout/Header/Header";
import StaticPage, {
  PageTitle,
  Paragraph,
  SectionHeader,
} from "@/components/layout/StaticPage/StaticPage";

export default function AboutPage() {
  return (
    <>
      <Header variant="internal" title="درباره ما" backUrl="/" />

      <StaticPage>
        <PageTitle>درباره کادوچی</PageTitle>

        <Paragraph>
          کادوچی از سال ۱۳۹۱ فعالیت خود را در حوزه هدیه، گل و محصولات مناسبتی
          آغاز کرد. هدف ما ایجاد تجربه‌ای ساده، سریع و لذت‌بخش در انتخاب و ارسال
          کادو برای عزیزان شماست. کادوچی همواره تلاش کرده با ترکیب خلاقیت، کیفیت
          و خدمات حرفه‌ای، بهترین تجربه خرید کادو را برای مشتریان خود فراهم کند.
        </Paragraph>
      </StaticPage>
    </>
  );
}
