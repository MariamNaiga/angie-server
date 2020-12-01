import {HttpException, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from './user.entity';
import {RegisterUserDto} from '../auth/dto/register-user.dto';
import SearchDto from '../shared/dto/search.dto';
import {ContactsService} from '../crm/contacts.service';
import Contact from '../crm/entities/contact.entity';
import {UpdateUserDto} from "./dto/update-user.dto";
import {UserListDto} from "./dto/user-list.dto";
import {getPersonFullName} from "../crm/crm.helpers";
import {hasValue} from "../utils/basicHelpers";
import {QueryDeepPartialEntity} from "typeorm/query-builder/QueryPartialEntity";
import * as nodemailer from "nodemailer";
import {JwtService} from '@nestjs/jwt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly repository: Repository<User>,
        private readonly contactsService: ContactsService,
        private readonly jwtService: JwtService
    ) {
    }

    async findAll(req: SearchDto): Promise<UserListDto[]> {
        const data = await this.repository.find({
            relations: ['contact', 'contact.person'],
            skip: req.skip,
            take: req.limit,
        });
        return data.map(this.toListModel)
    }

    toListModel(user: User): UserListDto {
        const fullName = getPersonFullName(user.contact.person);
        return {
            avatar: user.contact.person.avatar,
            contact: {
                id: user.contactId,
                name: fullName
            },
            id: user.id,
            roles: user.roles,
            username: user.username,
            contactId: user.contactId,
            fullName
        }
    }

    async create(data: User): Promise<User> {
        data.hashPassword();
        return await this.repository.save(data);
    }

    async register(dto: RegisterUserDto): Promise<User> {
        const contact = await this.contactsService.createPerson(dto);
        const user = new User();
        user.username = dto.email;
        user.password = dto.password;
        user.contact = Contact.ref(contact.id);
        user.roles = dto.roles
        user.hashPassword();
        return await this.repository.save(user);
    }

    async findOne(id: number): Promise<UserListDto> {
        const data = await this.repository.findOne(id, {
            relations: ['contact', 'contact.person']
        });
        return this.toListModel(data)
    }

    async update(data: UpdateUserDto): Promise<UserListDto> {
        const update: QueryDeepPartialEntity<User> = {
            roles: data.roles
        }

        if (hasValue(data.password)) {
            const user = new User()
            user.password = data.password;
            user.hashPassword()
            update.password = user.password;
        }

        await this.repository.createQueryBuilder()
            .update()
            .set(update)
            .where("id = :id", {id: data.id})
            .execute()
        return await this.findOne(data.id);
    }

    async remove(id: number): Promise<void> {
        await this.repository.delete(id);
    }

    async findByName(username: string): Promise<User> | undefined {
        return this.repository.findOne({where: {username}, relations: ['contact', 'contact.person']});
    }

    async exits(username: string): Promise<boolean> {
        const count = await this.repository.count({where: {username}});
        return count > 0;
    } 

    async getUserToken(user: User): Promise<string> {
        const payload = {"userId": user.id};
        const token = await this.jwtService.signAsync(payload, {expiresIn: 60 * 10 * 1000}); // expires after 10 minutes
        return token;
    }

    async decodeToken(token: string): Promise<any> {
        const decoded = await this.jwtService.decode(token);
        return decoded;
    }

    async resetPassword(token: string, newPassword: string): Promise<any> {
        const decodedToken = await this.decodeToken(token);

        const data: UpdateUserDto = {
            id: decodedToken.userId,
            password: newPassword,
            roles: (await this.findOne(decodedToken.userId)).roles
        } 
        const user = await this.update(data);
        if(!user) {
            throw new HttpException("Password Not Updated", 404);
        }

        const transporter = await this.mailTransporter();
        const info = await transporter.sendMail({
            from: "Worship Harvest",
            to: `${(await user).username}`,
            subject: "Password Change Confirmation",
            html: 
            `
                <h3>Hello ${(await user).fullName},</h3></br>
                <h4>Your Password has been changed successfully!<h4></br>
            `
        })
        return `Password Change Successful! ${nodemailer.getTestMessageUrl(info)}`;
    }

    async forgotPassword(username: string): Promise<string> {
        const user = await this.findByName(username);
        if (!user) {
            throw new HttpException("User Not Found", 404);
        }
        
        const name = (await this.findOne(user.id)).fullName;
        
        const transporter = await this.mailTransporter();
        const token = await this.getUserToken(user);
        const resetLink = `http://localhost:4002/resetPassword/token=${ await this.getUserToken(user) }&`;
        const dummyLink = 'https://www.google.com';

        const info = await transporter.sendMail({
            from: "Worship Harvest",
            to: `${(await user).username}`,
            subject: "Reset Password", 
            html: `
                <h3>Hello ${name}</h3></br>
                <h4>Here is a link to reset your Password!<h4></br>
                <a href=${dummyLink}>Reset Password</a></br>
                <p>** This link expires in 10 minutes **</p>
                <p>For testing purposes, here is your token: ${token} </p>
                <p>But this be the actual URL: ${resetLink}</p>
          
            `
        })
        return `Email With Reset Link Sent! ${nodemailer.getTestMessageUrl(info)} \n Token: ${token} \n Reset Link: ${resetLink}`;
    }
    async mailTransporter() {
        const testAccount = await nodemailer.createTestAccount();

        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
        if(!transporter) {
            throw new HttpException("Transporter Not Created", 404);
        }
        return transporter;
    }
}
