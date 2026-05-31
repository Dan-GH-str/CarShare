import { PrismaClient, PricingType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const images = {
  tesla: [
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617704548623-340376564e68?auto=format&fit=crop&w=1200&q=80',
  ],
  bmw: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80'],
  mercedes: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80'],
  audi: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80'],
  polo: ['https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80'],
  camry: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80'],
  tucson: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'],
  taycan: ['https://images.unsplash.com/photo-1611651338412-8403fa6e3599?auto=format&fit=crop&w=1200&q=80'],
};

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await prisma.user.upsert({
    where: { email: 'user@carshare.local' },
    update: {},
    create: {
      email: 'user@carshare.local',
      passwordHash,
      lastName: 'Смирнов',
      firstName: 'Алексей',
      middleName: 'Игоревич',
      phone: '+7 900 100-20-30',
      role: UserRole.USER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@carshare.local' },
    update: {},
    create: {
      email: 'admin@carshare.local',
      passwordHash,
      lastName: 'Администратор',
      firstName: 'CarShare',
      middleName: null,
      phone: '+7 900 500-60-70',
      role: UserRole.ADMIN,
    },
  });

  const categorySeed = [
    ['budget', 'Бюджетные', 'Практичные автомобили для ежедневных поездок.'],
    ['comfort', 'Комфорт', 'Больше пространства, тише салон, богаче комплектация.'],
    ['premium', 'Премиум', 'Автомобили с высоким уровнем оснащения.'],
    ['crossover', 'Кроссоверы', 'Удобная посадка и полный привод для разных маршрутов.'],
    ['electric', 'Электромобили', 'Тихие и технологичные автомобили без выхлопа.'],
  ] as const;

  const categories = new Map<string, string>();
  for (const [slug, name, description] of categorySeed) {
    const category = await prisma.carCategory.upsert({
      where: { slug },
      update: { name, description, isActive: true },
      create: { slug, name, description },
    });
    categories.set(slug, category.id);
  }

  const optionSeed = [
    {
      code: 'CHILD_SEAT',
      name: 'Детское кресло',
      description: 'Подготовим кресло перед началом аренды.',
      price: 250,
      pricingType: PricingType.FIXED,
      isActive: true,
    },
    {
      code: 'DELIVERY',
      name: 'Доставка автомобиля',
      description: 'Подгоним автомобиль к выбранной точке в городе.',
      price: 700,
      pricingType: PricingType.FIXED,
      isActive: true,
    },
  ];

  for (const option of optionSeed) {
    await prisma.extraOption.upsert({
      where: { code: option.code },
      update: option,
      create: option,
    });
  }

  await prisma.extraOption.updateMany({
    where: { code: 'DELAYED_START' },
    data: { isActive: false },
  });

  const carSeed = [
    {
      key: 'tesla-model-3',
      category: 'electric',
      brand: 'Tesla',
      name: 'Model 3',
      trim: 'Model 3 Long Range',
      transmission: 'AUTOMATIC',
      fuelType: 'ELECTRIC',
      driveType: 'AWD',
      seats: 5,
      year: 2023,
      color: 'Белый',
      vin: '5YJ3E1EA7KF000001',
      plateNumber: 'Е123КХ799',
      coords: [55.751244, 37.618423],
      address: 'Тверская улица, 7',
      mileage: 18400,
      hourlyPrice: 800,
      dailyPrice: 6500,
      longTermDailyPrice: 5600,
      images: images.tesla,
      features: ['Автопилот', 'Подогрев всех сидений', 'Панорамная крыша', 'Премиум аудио'],
      description: 'Электромобиль для города и трассы с большим запасом хода.',
    },
    {
      key: 'bmw-5-series',
      category: 'premium',
      brand: 'BMW',
      name: '5 Series',
      trim: '530i xDrive',
      transmission: 'AUTOMATIC',
      fuelType: 'GASOLINE',
      driveType: 'AWD',
      seats: 5,
      year: 2022,
      color: 'Черный',
      vin: 'WBAJA71050G000002',
      plateNumber: 'М530ВМ797',
      coords: [55.760186, 37.618711],
      address: 'Петровка, 18',
      mileage: 27100,
      hourlyPrice: 900,
      dailyPrice: 7200,
      longTermDailyPrice: 6100,
      images: images.bmw,
      features: ['Полный привод', 'Проекционный дисплей', 'Климат-контроль', 'Кожаный салон'],
      description: 'Комфортный бизнес-седан для деловых поездок.',
    },
    {
      key: 'mercedes-gle',
      category: 'crossover',
      brand: 'Mercedes-Benz',
      name: 'GLE',
      trim: 'GLE 450 4MATIC',
      transmission: 'AUTOMATIC',
      fuelType: 'HYBRID',
      driveType: 'AWD',
      seats: 5,
      year: 2023,
      color: 'Серый',
      vin: 'W1NFB5KB9PA000003',
      plateNumber: 'С450АМ799',
      coords: [55.744533, 37.594626],
      address: 'Пречистенка, 31',
      mileage: 15300,
      hourlyPrice: 1100,
      dailyPrice: 8500,
      longTermDailyPrice: 7600,
      images: images.mercedes,
      features: ['Пневмоподвеска', 'Камеры 360', 'Ассистенты движения', 'Премиум аудио'],
      description: 'Большой кроссовер для семьи, багажа и дальней дороги.',
    },
    {
      key: 'audi-a6',
      category: 'comfort',
      brand: 'Audi',
      name: 'A6',
      trim: 'A6 45 TFSI Quattro',
      transmission: 'AUTOMATIC',
      fuelType: 'GASOLINE',
      driveType: 'AWD',
      seats: 5,
      year: 2022,
      color: 'Синий',
      vin: 'WAUZZZF2XNN000004',
      plateNumber: 'А645АА797',
      coords: [55.734338, 37.589091],
      address: 'Зубовский бульвар, 4',
      mileage: 22400,
      hourlyPrice: 850,
      dailyPrice: 6800,
      longTermDailyPrice: 5900,
      images: images.audi,
      features: ['Quattro', 'Матричные фары', 'Виртуальная приборная панель', 'Подогрев руля'],
      description: 'Сбалансированный седан с хорошей динамикой и удобным салоном.',
    },
    {
      key: 'volkswagen-polo',
      category: 'budget',
      brand: 'Volkswagen',
      name: 'Polo',
      trim: 'Polo Highline',
      transmission: 'AUTOMATIC',
      fuelType: 'GASOLINE',
      driveType: 'FWD',
      seats: 5,
      year: 2021,
      color: 'Красный',
      vin: 'XW8ZZZCKZMG000005',
      plateNumber: 'Р350РО797',
      coords: [55.777506, 37.655008],
      address: 'Комсомольская площадь, 3',
      mileage: 41200,
      hourlyPrice: 350,
      dailyPrice: 2500,
      longTermDailyPrice: 2100,
      images: images.polo,
      features: ['Камера заднего вида', 'CarPlay', 'Парктроники', 'Низкий расход'],
      description: 'Доступный городской автомобиль для коротких поездок.',
    },
    {
      key: 'toyota-camry',
      category: 'comfort',
      brand: 'Toyota',
      name: 'Camry',
      trim: 'Camry 2.5',
      transmission: 'AUTOMATIC',
      fuelType: 'GASOLINE',
      driveType: 'FWD',
      seats: 5,
      year: 2022,
      color: 'Белый',
      vin: 'JTNB11HKXNJ000006',
      plateNumber: 'Т550ТТ797',
      coords: [55.706246, 37.633514],
      address: 'Автозаводская улица, 18',
      mileage: 28600,
      hourlyPrice: 550,
      dailyPrice: 4200,
      longTermDailyPrice: 3600,
      images: images.camry,
      features: ['Большой багажник', 'Адаптивный круиз', 'Подогрев сидений', 'Тихий салон'],
      description: 'Надежный седан для повседневных и деловых маршрутов.',
    },
    {
      key: 'hyundai-tucson',
      category: 'crossover',
      brand: 'Hyundai',
      name: 'Tucson',
      trim: 'Tucson Premium',
      transmission: 'AUTOMATIC',
      fuelType: 'GASOLINE',
      driveType: 'AWD',
      seats: 5,
      year: 2022,
      color: 'Зеленый',
      vin: 'KMHJ381ASNU000007',
      plateNumber: 'Н650НС797',
      coords: [55.795272, 37.537826],
      address: 'Ленинградский проспект, 36',
      mileage: 19700,
      hourlyPrice: 650,
      dailyPrice: 5000,
      longTermDailyPrice: 4300,
      images: images.tucson,
      features: ['Полный привод', 'Рейлинги', 'Камера заднего вида', 'Беспроводная зарядка'],
      description: 'Кроссовер с удобной посадкой и вместительным салоном.',
    },
    {
      key: 'porsche-taycan',
      category: 'electric',
      brand: 'Porsche',
      name: 'Taycan',
      trim: 'Taycan 4S',
      transmission: 'AUTOMATIC',
      fuelType: 'ELECTRIC',
      driveType: 'AWD',
      seats: 4,
      year: 2023,
      color: 'Серебристый',
      vin: 'WP0ZZZY1ZNSA000008',
      plateNumber: 'Р004СН799',
      coords: [55.749986, 37.539544],
      address: 'Пресненская набережная, 12',
      mileage: 9300,
      hourlyPrice: 1500,
      dailyPrice: 12000,
      longTermDailyPrice: 10400,
      images: images.taycan,
      features: ['Спортивный режим', 'Быстрая зарядка', 'Пневмоподвеска', 'Матрица LED'],
      description: 'Электрический спорт-седан для особенных поездок.',
    },
  ] as const;

  for (const item of carSeed) {
    const model = await prisma.carModel.upsert({
      where: {
        brand_name_trim: {
          brand: item.brand,
          name: item.name,
          trim: item.trim,
        },
      },
      update: {
        transmission: item.transmission,
        fuelType: item.fuelType,
        driveType: item.driveType,
        seats: item.seats,
        year: item.year,
        features: [...item.features],
        description: item.description,
      },
      create: {
        brand: item.brand,
        name: item.name,
        trim: item.trim,
        transmission: item.transmission,
        fuelType: item.fuelType,
        driveType: item.driveType,
        seats: item.seats,
        year: item.year,
        features: [...item.features],
        description: item.description,
      },
    });

    const car = await prisma.car.upsert({
      where: { vin: item.vin },
      update: {
        modelId: model.id,
        categoryId: categories.get(item.category)!,
        color: item.color,
        status: 'AVAILABLE',
        latitude: item.coords[0],
        longitude: item.coords[1],
        address: item.address,
        mileage: item.mileage,
        images: [...item.images],
      },
      create: {
        modelId: model.id,
        categoryId: categories.get(item.category)!,
        vin: item.vin,
        plateNumber: item.plateNumber,
        color: item.color,
        latitude: item.coords[0],
        longitude: item.coords[1],
        address: item.address,
        mileage: item.mileage,
        images: [...item.images],
      },
    });

    await prisma.tariff.create({
      data: {
        carId: car.id,
        hourlyPrice: item.hourlyPrice,
        dailyPrice: item.dailyPrice,
        longTermDailyPrice: item.longTermDailyPrice,
        longTermFromDays: 7,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
