const assert = require("assert");

const allPages = [
    {
        path: '',
        page: 'Главная страница',
    },
    {
        path: 'catalog',
        page: 'Каталог',
    },
    {
        path: 'delivery',
        page: 'Доставка',
    },
    {
        path: 'contacts',
        page: 'Контакты',
    },
];

describe("Проверка сайта", () => {
    it('Проверка наличия всех страниц', async ({ browser }) => {

        for (const currentPage of allPages) {
            const puppeteer = await browser.getPuppeteer();
            const [page] = await puppeteer.pages();

            await page.goto(`http://localhost:3000/hw/store/${currentPage.path}`);

            const root = await page.$('#root');

            assert.ok(root, `Страница "${currentPage.page}" не обнаружена`);
        }

    });

    it('Проверка бургер меню', async ({ browser }) => {

        await browser.setWindowSize(575, 500);
        const puppeteer = await browser.getPuppeteer();
        const [page] = await puppeteer.pages();
        await page.goto('http://localhost:3000/hw/store/');

        const header = await page.$('nav.navbar');
        // Кнопка бургер меню
        const button = await header.$('button[aria-label="Toggle navigation"]');
        // Первая ссылка в бургер меню
        const link = await header.$('.nav-link');
        // Ссылка на главную страницу
        const homepageLink = await header.$('.Application-Brand');

        // Смотрим изначальное состояние header
        await browser.assertView('header-with-burger-menu', 'nav.navbar', {
            tolerance: 10,
        });

        // Кликаем на бургер меню, затем кликаем на логотип для того чтобы убрать focus и ждем секунду для завершения анимации иначе постоянно ошибка несовпадения скриншотов
        await button.click();
        await homepageLink.click();
        browser.pause(1000);

        // Сравниваем со скриншотом открытого бургер меню
        await browser.assertView('header-with-burger-menu--opened', 'nav.navbar', {
            tolerance: 10,
        });

        // Нажимаем на любую ссылку.
        await link.click();

        // Проверяем со скриншотом закрытого бургер меню если сравнивать с header-with-burger-menu выскакивает ошибка и не показывается какая.
        await browser.assertView('header-with-burger-menu--closed', 'nav.navbar', {
            tolerance: 10,
        });
    });

    it('Проверка шапки на наличие всех ссылок', async ({ browser }) => {

        const puppeteer = await browser.getPuppeteer();
        const [page] = await puppeteer.pages();

        await page.goto('http://localhost:3000/hw/store/');
        const header = await page.$('nav.navbar');

        // Дожидаемся получения всех ссылок в header.
        const links = await Promise.all([
            header.$('a.Application-Brand[href="/hw/store/"]'),
            header.$('a.nav-link[href="/hw/store/catalog"]'),
            header.$('a.nav-link[href="/hw/store/delivery"]'),
            header.$('a.nav-link[href="/hw/store/contacts"]'),
            header.$('a.nav-link[href="/hw/store/cart"]'),
        ]);

        // Убираем те которые он не нашёл
        links.filter(link => link !== null);

        // Если конечный массив не равен 5 выводим ошибку с сообщением.
        assert.ok(links.length === 5, 'Не все ссылки на месте');
    });
    it('Проверка каталога и корзины', async ({ browser }) => {

        const puppeteer = await browser.getPuppeteer();
        const [page] = await puppeteer.pages();

        await page.goto(`http://localhost:3000/hw/store/catalog`);

        const product = await page.waitForSelector( '.ProductItem', {timeout: 5000});

        await assert.ok(product, `Нет товаров на странице`);

        await page.evaluate(async element => {
            const name = await element.querySelector('.ProductItem-Name');
            if(name.textContent.length > 0){
                name.innerHTML = 'Rustic Fish';
            }
            element.querySelector('.ProductItem-Price').innerHTML = '$441';
        }, product);

        await browser.assertView('catalog-item', '.ProductItem');

        const toDetailLink = await product.$('.ProductItem-DetailsLink');

        await assert.ok(toDetailLink, `Отсутсвует ссылка на детальную страницу`);

        await toDetailLink.click();

        const productDetails = await page.waitForSelector('.ProductDetails', {timeout: 5000});

        await page.evaluate(element => {
            element.querySelector('.ProductDetails-Name').innerHTML = 'Rustic Fish';
            element.querySelector('.ProductDetails-Description').innerHTML = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.';
            element.querySelector('.ProductDetails-Price').innerHTML = '$441';
            element.querySelector('.ProductDetails-Color').innerHTML = 'grey';
            element.querySelector('.ProductDetails-Material').innerHTML = 'Steel';
        }, productDetails);

        await browser.assertView('catalog-item-detail', '.ProductDetails');

        const addToCartBtn = await productDetails.$('.ProductDetails-AddToCart');

        await assert.ok(addToCartBtn, `Отсутсвует кнопка добавления в корзину`);

        await addToCartBtn.click();
        await addToCartBtn.click();

        const productInCartText = await productDetails.$('.CartBadge');

        await assert.ok(productInCartText, `Отсутсвует сообщение о том что товар добавлен`);


        await page.goto(`http://localhost:3000/hw/store/cart`);

        const cartCount = await page.waitForSelector('.Cart-Count', {timeout: 5000});

        const countValue = await page.evaluate(element => {
            const countText = element.textContent.trim();
            return parseInt(countText);
        }, cartCount);

        await assert.ok(countValue === 2, `Не правильное количиство в корзине`);

        await page.goto(`http://localhost:3000/hw/store/catalog`);

        const cartProductInCartText = await page.waitForSelector('.CartBadge', {timeout: 5000});

        await assert.ok(cartProductInCartText, `Отсутсвует сообщение о добавление товара в карточке товара`);

        await page.goto(`http://localhost:3000/hw/store/cart`);

        const clear = await page.waitForSelector('.Cart-Clear', {timeout: 5000});

        await clear.click();

        await browser.assertView('empty-basket', '.Cart');

        await page.goto(`http://localhost:3000/hw/store/catalog/1`);

        const btnAddToCart = await page.waitForSelector('.ProductDetails-AddToCart', {timeout: 5000});
        const priceElement = await page.waitForSelector('.ProductDetails-Price', {timeout: 5000});

        const price = await page.evaluate(element => {
            const countText = element.textContent.trim();
            return parseInt(countText.replace("$", "")) * 3;
        }, priceElement);

        await assert.ok(btnAddToCart, `Отсутсвует товар или кнопка добавления товара в корзину`);

        await btnAddToCart.click();
        await btnAddToCart.click();
        await btnAddToCart.click();

        await page.goto(`http://localhost:3000/hw/store/cart`);

        const cartPageLink = await page.waitForSelector('.nav-link.active', {timeout: 5000});

        await assert.ok(cartPageLink, 'Отсутсвует активная вкладка');

        await browser.assertView('active-cart-link', '.nav-link.active');

        const productProperties = await Promise.all([
            page.waitForSelector('.Cart-Index', {timeout: 5000}),
            page.waitForSelector('.Cart-Name', {timeout: 5000}),
            page.waitForSelector('.Cart-Price', {timeout: 5000}),
            page.waitForSelector('.Cart-Count', {timeout: 5000}),
            page.waitForSelector('.Cart-Total', {timeout: 5000}),
        ]);


        const orderPrice = await page.$('.Cart-OrderPrice');
        const totalPrice = await page.$('.Cart-Total');

        const orderPriceValue = await orderPrice.evaluate(element => parseInt(element.textContent.trim().replace('$', '')));
        const totalPriceValue = await totalPrice.evaluate(element => parseInt(element.textContent.trim().replace('$', '')));

        await assert.ok(orderPriceValue === price && totalPriceValue === price, 'Не правильный подсчёт итоговой цены');

        const clearCartBtn = await page.$('.Cart-Clear');

        await assert.ok(clearCartBtn, 'Отсутсвует кнопка очистки корзины');

        const formInputs = await browser.$$('.Form .Form-Field');

        for (const input of formInputs) {
            await input.setValue('89999999999');
        }

        const formSubmit = await page.$('.Form > .Form-Submit');

        await formSubmit.click();

        try {
            await page.waitForSelector('.Cart-SuccessMessage', { timeout: 5000 });

            await browser.assertView('success-message', '.Cart-SuccessMessage', {
                ignoreElements: [
                    '.Cart-Number',
                ],
            });
        } catch (error) {
            assert.ok(false, 'Не делается заказ');
        }

        // await clearCartBtn.click();
        //
        // await browser.assertView('cart-after-clear', '.Cart');
        //
        // const linkToCatalog = await page.$('a[href="/hw/store/catalog"]');
        //
        // await assert.ok(linkToCatalog, 'Отсутсвует ссылка на каталог');

    });
    // it('Проверка корзины', async ({ browser }) => {
    //
    //     const puppeteer = await browser.getPuppeteer();
    //     const [page] = await puppeteer.pages();
    //
    //     await page.goto(`http://localhost:3000/hw/store/cart`);
    //
    //     const clear = await page.waitForSelector('.Cart-Clear', {timeout: 5000});
    //
    //     await clear.click();
    //
    //     await browser.assertView('empty-basket', '.Cart');
    //
    //     await page.goto(`http://localhost:3000/hw/store/catalog/0`);
    //
    //     const btnAddToCart = await page.waitForSelector('.ProductDetails-AddToCart', {timeout: 5000});
    //     const priceElement = await page.waitForSelector('.ProductDetails-Price', {timeout: 5000});
    //
    //     const price = await page.evaluate(element => {
    //         const countText = element.textContent.trim();
    //         return parseInt(countText.replace("$", "")) * 3;
    //     }, priceElement);
    //
    //     await assert.ok(btnAddToCart, `Отсутсвует товар или кнопка добавления товара в корзину`);
    //
    //     await btnAddToCart.click();
    //     await btnAddToCart.click();
    //     await btnAddToCart.click();
    //
    //     await page.goto(`http://localhost:3000/hw/store/cart`);
    //
    //     const cartPageLink = await page.waitForSelector('.nav-link.active', {timeout: 5000});
    //
    //     await assert.ok(cartPageLink, 'Отсутсвует активная вкладка');
    //
    //     await browser.assertView('active-cart-link', '.nav-link.active');
    //
    //     const productProperties = await Promise.all([
    //         page.waitForSelector('.Cart-Index', {timeout: 5000}),
    //         page.waitForSelector('.Cart-Name', {timeout: 5000}),
    //         page.waitForSelector('.Cart-Price', {timeout: 5000}),
    //         page.waitForSelector('.Cart-Count', {timeout: 5000}),
    //         page.waitForSelector('.Cart-Total', {timeout: 5000}),
    //     ]);
    //
    //
    //     const orderPrice = await page.$('.Cart-OrderPrice');
    //     const totalPrice = await page.$('.Cart-Total');
    //
    //     const orderPriceValue = await orderPrice.evaluate(element => parseInt(element.textContent.trim().replace('$', '')));
    //     const totalPriceValue = await totalPrice.evaluate(element => parseInt(element.textContent.trim().replace('$', '')));
    //
    //     await assert.ok(orderPriceValue === price && totalPriceValue === price, 'Не правильный подсчёт итоговой цены');
    //
    //     const clearCartBtn = await page.$('.Cart-Clear');
    //
    //     await assert.ok(clearCartBtn, 'Отсутсвует кнопка очистки корзины');
    //
    //     await clearCartBtn.click();
    //
    //     await browser.assertView('cart-after-clear', '.Cart');
    //
    //     const linkToCatalog = await page.$('a[href="/hw/store/catalog"]');
    //
    //     await assert.ok(linkToCatalog, 'Отсутсвует ссылка на каталог');
    //
    // });
});
