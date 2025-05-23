<?php
/**
 * Copyright (c) 2025 vickymosafan. All Rights Reserved.
 * 
 * This source code is protected under international copyright law.
 * Unauthorized reproduction, distribution, or modification of this file is prohibited.
 * This code contains proprietary security measures that prevent modification.
 * Any attempt to modify by unauthorized parties will be subject to legal action.
 */

use App\Http\Controllers\BeritaController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PendudukController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\PendudukMiddleware;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// Admin routes
Route::middleware(['auth', 'verified', AdminMiddleware::class])->prefix('admin')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');

    // Verifikasi Akun Penduduk
    Route::get('verifikasi', function () {
        return Inertia::render('admin/verifikasi');
    })->name('admin.verifikasi');

    // Manajemen Penduduk
    Route::controller(PendudukController::class)->group(function () {
        Route::get('penduduk', 'index')->name('admin.penduduk');
        Route::post('penduduk', 'store')->name('admin.penduduk.store');
        Route::get('penduduk/{penduduk}', 'show')->name('admin.penduduk.show');
        Route::put('penduduk/{penduduk}', 'update')->name('admin.penduduk.update');
        Route::delete('penduduk/{penduduk}', 'destroy')->name('admin.penduduk.destroy');
    });

    // Manajemen Dokumen
    Route::controller(DocumentController::class)->group(function () {
        Route::get('dokumen', 'adminIndex')->name('admin.dokumen');
        Route::get('dokumen/{document}', 'show')->name('admin.dokumen.show');
        Route::post('dokumen/{document}/approve', 'approve')->name('admin.dokumen.approve');
        Route::post('dokumen/{document}/reject', 'reject')->name('admin.dokumen.reject');
        Route::get('dokumen/{document}/download', 'adminDownload')->name('admin.dokumen.download');
    });

    // Manajemen Berita
    Route::controller(BeritaController::class)->group(function () {
        Route::get('berita', 'adminIndex')->name('admin.berita');
        Route::get('berita/create', 'create')->name('admin.berita.create');
        Route::post('berita', 'store')->name('admin.berita.store');
        Route::get('berita/{berita}', 'show')->name('admin.berita.show');
        Route::get('berita/{berita}/edit', 'edit')->name('admin.berita.edit');
        Route::put('berita/{berita}', 'update')->name('admin.berita.update');
        Route::post('berita/{berita}/update-image', 'updateImage')->name('admin.berita.update-image');
        Route::delete('berita/{berita}', 'destroy')->name('admin.berita.destroy');
    });
});

// Penduduk routes
Route::middleware(['auth', 'verified', PendudukMiddleware::class])->prefix('penduduk')->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('penduduk/dashboard');
    })->name('penduduk.dashboard');

    // Document routes
    Route::controller(DocumentController::class)->group(function () {
        Route::get('documents', 'index')->name('documents.index');
        Route::post('documents', 'store')->name('documents.store');
    });

    // Berita routes
    Route::get('berita', [BeritaController::class, 'pendudukIndex'])->name('penduduk.berita');
    Route::get('berita/{berita}', [BeritaController::class, 'pendudukShow'])->name('penduduk.berita.show');
});

// Public document download route (must be outside the penduduk group to match frontend URL)
Route::get('/document/{document}/download', [DocumentController::class, 'download'])->middleware(['auth'])->name('document.download');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
