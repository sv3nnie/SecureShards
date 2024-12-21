const prime = 211;

const add = (a, b) => (a + b) % prime;
const subtract = (a, b) => ((a - b) % prime + prime) % prime;
const multiply = (a, b) => (a * b) % prime;
const divide = (a, b) => multiply(a, inversemod(b, prime));
const inversemod = (a, m) => {
    a = ((a % m) + m) % m;
    let [x1, x2, y1, y2] = [1, 0, 0, 1];
    while (m > 0) {
        let q = Math.floor(a / m);
        [a, m] = [m, a - q * m];
        [x1, x2] = [x2, subtract(x1, multiply(q, x2))];
        [y1, y2] = [y2, subtract(y1, multiply(q, y2))];
    }
    if (a !== 1) throw new Error('Inverse does not exist');
    return x1;
};

// Polynomial evaluation
const evaluatePolynomial = (coefficients, x) => {
    let result = 0;
    for (let i = coefficients.length - 1; i >= 0; i--) {
        result = add(multiply(result, x), coefficients[i]);
    }
    return result;
};

// Lagrange interpolation
const interpolate = (shares, x) => {
    let result = 0;
    for (let i = 0; i < shares.length; i++) {
        let term = shares[i][1];
        for (let j = 0; j < shares.length; j++) {
            if (i !== j) {
                term = multiply(term, divide(subtract(x, shares[j][0]), subtract(shares[i][0], shares[j][0])));
            }
        }
        result = add(result, term);
    }
    return result;
};

// Generate a random polynomial
const generatePolynomial = (degree, intercept) => {
    const coefficients = [intercept];
    for (let i = 1; i <= degree; i++) {
        coefficients.push(Math.floor(Math.random() * prime));
    }
    return coefficients;
};

// Split the secret into shares
const split = (secret, numShares, threshold) => {
    const polynomial = generatePolynomial(threshold - 1, secret);
    const shares = [];
    for (let i = 1; i <= numShares; i++) {
        const share = [i, evaluatePolynomial(polynomial, i)];
        shares.push(share);
    }
    return shares;
};

// Reconstruct the secret from shares
const reconstruct = (shares) => {
    const secret = interpolate(shares, 0);
    return secret;
};

// Convert a string to an array of ASCII values
const stringToAsciiArray = (str) => {
    return str.split('').map(char => char.charCodeAt(0));
};

// Convert an array of ASCII values back to a string
const asciiArrayToString = (arr) => {
    return arr.map(code => String.fromCharCode(code)).join('');
};

// Encryption and encoding function for the shares
const encryptShare = async (share, password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(share.map(s => s.join(' ')).join(','));

    const key = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    const aesKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        data
    );

    return `${Buffer.from(iv).toString('base64')}:${Buffer.from(encryptedData).toString('base64')}`;
};

// Split the secret into encrypted shares
export const splitString = async (secret, numShares, threshold, password) => {
    const asciiValues = stringToAsciiArray(secret);
    const combinedShares = Array.from({ length: numShares }, () => []);

    asciiValues.forEach(value => {
        const characterShares = split(value, numShares, threshold);
        characterShares.forEach((share, index) => {
            combinedShares[index].push(share);
        });
    });

    return await Promise.all(
        combinedShares.map(share => encryptShare(share, password))
    );
};

// Decryption and decoding function for shares
const decryptShare = async (encryptedShare, password) => {
    const [iv, encryptedData] = encryptedShare.split(':').map(part => Buffer.from(part, 'base64'));

    const encoder = new TextEncoder();
    const key = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    const aesKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);

    const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encryptedData
    );

    const decodedData = new TextDecoder('utf-8').decode(decryptedData);
    return decodedData.split(',').map(part => part.split(' ').map(Number));
};

// Reconstruct the secret from combined encrypted shares
export const reconstructString = async (encryptedShares, password) => {
    const decryptedShares = await Promise.all(
        encryptedShares.map(share => decryptShare(share, password))
    );

    const asciiValues = Array.from({ length: decryptedShares[0].length }, (_, index) =>
        reconstruct(decryptedShares.map(share => share[index]))
    );

    return asciiArrayToString(asciiValues);
};