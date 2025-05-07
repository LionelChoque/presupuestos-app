import { execSync } from 'child_process';

console.log('Compilando Tailwind CSS...');
try {
  execSync('npx tailwindcss -i ./client/src/index.css -o ./dist/public/tailwind.css', { stdio: 'inherit' });
  console.log('CSS compilado con éxito.');
} catch (error) {
  console.error('Error al compilar CSS:', error.message);
}
