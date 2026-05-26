import logger from "./logger"

export interface ServiceFormat {
    active: boolean,
    id: string,
    execute: () => any | Promise<any>
    timer: NodeJS.Timeout | undefined,
    description?: string,
    name: string,
    activeMin: number
}

export interface DefaultService {
    active: boolean,
    execute: () => any | Promise<any>
    description?: string,
    name: string,
    activeMin: number
}

class ServiceManagerInstance {
    defaultServices: DefaultService[] = []
    services: ServiceFormat[] = []

    InitialServiceManager = (defaultServices: DefaultService[] = []) => {
        this.defaultServices = defaultServices

        this.defaultServices.forEach((service) => {
            this.RunService(service)
        })
    }

    RunService = (service: DefaultService) => {
        const serviceID = crypto.randomUUID()
        let timer: NodeJS.Timeout | undefined = undefined

        if (service.active) timer = setInterval(() => {
            try {
                service["execute"]()
            } catch (error) { logger.error(`Failed Execute ${service["name"]}`, error) }
        }, service["activeMin"] * 60 * 1000)

        try {
            service["execute"]()
        } catch (error) { logger.error(`Failed Execute ${service["name"]}`, error) }

        this.services.push({
            active: service["active"],
            id: serviceID,
            execute: service["execute"],
            timer: timer,
            name: service["name"],
            description: service["description"],
            activeMin: service["activeMin"]
        })
    }

    StopService = (name: string) => {
        let service = this.services.find((v) => v["name"] == name)
        if (!service) service = this.services.find((v) => v["id"] == name)

        if (!service) return

        if (service["timer"]) clearInterval(service["timer"])

        this.services = this.services.map((s) => s["id"] == service["id"] ? {
            ...service,
            time: undefined,
            active: false
        } : s)
    }

    ActiveService = (name: string) => {
        let service = this.services.find((v) => v["name"] == name)
        if (!service) service = this.services.find((v) => v["id"] == name)

        if (!service) return

        const timer = setInterval(() => {
            try {
                service["execute"]()
            } catch (error) { logger.error(`Failed Execute ${service["name"]}`, error) }
        }, service["activeMin"] * 60 * 1000)

        try {
            service["execute"]()
        } catch (error) { logger.error(`Failed Execute ${service["name"]}`, error) }

        this.services = this.services.map((s) => s["id"] == service["id"] ? {
            ...service,
            time: timer,
            active: true
        } : s)
    }
}

export const ServiceManager = new ServiceManagerInstance