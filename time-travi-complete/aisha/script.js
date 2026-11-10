// پیدا کردن عناصر صفحه

const welcomeForm = document.querySelector("#welcomeForm");
const visitorName = document.querySelector("#visitorName");
const message = document.querySelector("#message");

// هنگام ارسال فرم

welcomeForm.addEventListener("submit", function (event) {

    // جلوگیری از بارگذاری مجدد صفحه
    event.preventDefault();

    const name = visitorName.value.trim();

    // بررسی خالی نبودن نام
    if (name === "") {
        message.textContent = "لطفاً نام خود را وارد کنید.";
        message.style.color = "#ff7777";
        return;
    }

    // ذخیره نام مسافر
    sessionStorage.setItem("travelerName", name);

    // نمایش پیام خوش آمدگویی
    message.textContent = `خوش آمدی ${name}! ماشین زمان آماده حرکت است...`;
    message.style.color = "#70dce8";

    // افکت خروج
    document.body.style.transition = "opacity 1s";
    document.body.style.opacity = "0";

    // انتقال به صفحه اصلی پروژه
    setTimeout(function () {
        window.location.href = "index.html";
    }, 1000);

});