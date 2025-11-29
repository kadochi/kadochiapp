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
              a: "برای ثبت سفارش کافیست وارد صفحه محصول مورد نظر خود شوید و بر روی اضافه به سبد خرید کلیک کنید. سپس در بالای صفحه بر روی آیکون سبد خرید کلیک کرده و مراحل پرداخت را تکمیل نمایید.",
            },
            {
              q: "زمان ارسال چگونه است؟",
              a: "زمان ارسال با توجه به نوع محصول و منطقه شما متفاوت است. معمولاً سفارش‌ها در همان روز یا روز بعد ارسال می‌شوند. برای اطلاعات دقیق‌تر، لطفاً به صفحه محصول مراجعه کنید.",
            },
            {
              q: "آیا می‌توانم سفارش را برای شخص دیگری ارسال کنم؟",
              a: "بله شما می‌تواند هنگام ثبت سفارش، آدرس و مشخصات گیرنده را وارد کنید تا سفارش مستقیماً برای آن شخص ارسال شود.",
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
