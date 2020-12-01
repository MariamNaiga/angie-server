import {IsNotEmpty, IsNumber} from 'class-validator';

export class UpdateUserDto {
    @IsNotEmpty()
    @IsNumber()
    id: number;

    roles?: string[];

    password?: string;
}
