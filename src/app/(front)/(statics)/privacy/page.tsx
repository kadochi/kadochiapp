import Header from "@/components/layout/Header/Header";
import StaticPage, {
  PageTitle,
  Paragraph,
  SectionHeader,
} from "@/components/layout/StaticPage/StaticPage";

export default function PrivacyPage() {
  return (
    <>
      <Header variant="internal" title="حریم خصوصی" backUrl="/" />

      <StaticPage>
        <PageTitle>حفظ حریم شخصی</PageTitle>

        <SectionHeader>جمع‌آوری داده‌ها</SectionHeader>
        <Paragraph>
          اطلاعات کاربران تنها برای ارائه خدمات بهتر جمع‌آوری شده و تحت هیچ
          شرایطی در اختیار دیگران قرار نمی‌گیرد.
        </Paragraph>

        <SectionHeader>حفظ امنیت</SectionHeader>
        <Paragraph>
          اطلاعات شما با استفاده از پروتکل‌های امنیتی استاندارد محافظت می‌شود.
        </Paragraph>
      </StaticPage>
    </>
  );
}
