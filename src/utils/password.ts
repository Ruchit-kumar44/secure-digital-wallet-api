import bcrypt from "bcryptjs"

const SALT_ROUNDS = 12;

//hash password
export const hashPassword = (plain: string)=>{
    return(
        bcrypt.hash(plain, SALT_ROUNDS)
    )
}

//verify hash passowrd compare
export const verifyPassword = (plain: string, hash: string)=>{
    return(
        bcrypt.compare(plain, hash)
    )
}

// Used when a phone number doesn't exist, so login takes about the same time either way
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);