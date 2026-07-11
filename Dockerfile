FROM php:8.2-fpm

# 1. Instalar dependencias requeridas por Composer
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    && docker-php-ext-install pdo pdo_mysql zip

# 2. Instalar Composer (Copiándolo desde la imagen oficial de Docker)
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer