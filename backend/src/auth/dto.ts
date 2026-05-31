import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Фамилия должна быть строкой' })
  @IsNotEmpty({ message: 'Фамилия не заполнена' })
  @MinLength(2, { message: 'Фамилия должна быть не короче 2 символов' })
  @Matches(/^[А-Яа-яЁёA-Za-z -]+$/, { message: 'Фамилия может содержать только буквы, пробел и дефис' })
  lastName!: string;

  @IsString({ message: 'Имя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя не заполнено' })
  @MinLength(2, { message: 'Имя должно быть не короче 2 символов' })
  @Matches(/^[А-Яа-яЁёA-Za-z -]+$/, { message: 'Имя может содержать только буквы, пробел и дефис' })
  firstName!: string;

  @IsOptional()
  @IsString({ message: 'Отчество должно быть строкой' })
  @MinLength(2, { message: 'Отчество должно быть не короче 2 символов' })
  @Matches(/^[А-Яа-яЁёA-Za-z -]+$/, { message: 'Отчество может содержать только буквы, пробел и дефис' })
  middleName?: string;

  @IsEmail({}, { message: 'Введите email в формате name@example.com' })
  @IsNotEmpty({ message: 'Email не заполнен' })
  email!: string;

  @IsString({ message: 'Телефон должен быть строкой' })
  @Matches(/^\+?[0-9][0-9\s().-]{9,19}$/, {
    message: 'Телефон должен содержать от 10 до 20 цифр, можно использовать +, пробелы, скобки и дефисы',
  })
  phone!: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  @Matches(/[A-Za-zА-Яа-яЁё]/, { message: 'Пароль должен содержать хотя бы одну букву' })
  @Matches(/\d/, { message: 'Пароль должен содержать хотя бы одну цифру' })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Введите email в формате name@example.com' })
  @IsNotEmpty({ message: 'Email не заполнен' })
  email!: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Пароль не заполнен' })
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
