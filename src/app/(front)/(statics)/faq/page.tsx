import Header from "@/components/layout/Header/Header";
import StaticPage, {
  PageTitle,
} from "@/components/layout/StaticPage/StaticPage";
import Accordion from "@/components/ui/Accordion/Accordion";

export default function FaqPage() {
  return (
    <>
      <Header variant="internal" title="سوالات متداول" backUrl="/" />

      <StaticPage>
        <PageTitle>سوالات متداول</PageTitle>

        <Accordion
          items={[
            {
              q: "چطور سفارش ثبت کنم؟",
              a: "از طریق صفحه محصولات کادو مورد نظر را انتخاب و ثبت سفارش کنید.",
            },
            {
              q: "زمان ارسال چگونه است؟",
              a: "ارسال همان‌روز در مناطق تحت پوشش امکان‌پذیر است.",
            },
            {
              q: "آیا امکان لغو سفارش هست؟",
              a: "بله، طبق قوانین لغو سفارش که در بخش قوانین آمده است.",
            },
          ]}
        />
      </StaticPage>
    </>
  );
}
