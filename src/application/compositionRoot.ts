import { IndexedDbScheduleRepository } from "@/infrastructure/repositories/IndexedDbScheduleRepository";
import { IndexedDbUserRepository } from "@/infrastructure/repositories/IndexedDbUserRepository";
import { LocalAuthService } from "@/infrastructure/auth/LocalAuthService";
import { AuthService } from "./services/AuthService";
import { ScheduleService } from "./services/ScheduleService";
import { SchedulingService } from "./services/SchedulingService";

const scheduleRepository = new IndexedDbScheduleRepository();
const userRepository = new IndexedDbUserRepository();
const localAuthService = new LocalAuthService(userRepository);

export const authService = new AuthService(localAuthService);
export const scheduleService = new ScheduleService(scheduleRepository);
export const schedulingService = new SchedulingService();
export { scheduleRepository, userRepository };
