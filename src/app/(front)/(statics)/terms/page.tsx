import Header from "@/components/layout/Header/Header";
import StaticPage, {
  PageTitle,
  Paragraph,
  SectionHeader,
} from "@/components/layout/StaticPage/StaticPage";

export default function TermsPage() {
  return (
    <>
      <Header variant="internal" title="قوانین و مقررات" backUrl="/" />

      <StaticPage>
        <PageTitle>قوانین و مقررات</PageTitle>

        <SectionHeader>۱. شرایط استفاده</SectionHeader>
        <Paragraph>
          استفاده از خدمات کادوچی به معنای پذیرش کلیه قوانین جاری پلتفرم است.
        </Paragraph>

        <SectionHeader>۲. مسئولیت‌ها</SectionHeader>
        <Paragraph>
          کادوچی مسئولیت ارسال صحیح سفارش‌ها را برعهده دارد اما اطلاعات اشتباه
          ثبت‌شده توسط کاربر شامل این مسئولیت نمی‌شود.
        </Paragraph>

        <SectionHeader>۳. لغو سفارش</SectionHeader>
        <Paragraph>
          در صورت لغو سفارش، قوانین مربوط به بازگشت وجه طبق سیاست‌های مالی
          کادوچی اعمال خواهد شد.
        </Paragraph>
      </StaticPage>
    </>
  );
}
