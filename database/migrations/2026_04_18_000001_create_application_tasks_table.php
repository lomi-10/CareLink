<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Run: php artisan migrate
 * MySQL raw SQL is also in carelink_api/migrations/application_tasks.sql (Laragon / shared DB).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('created_by');
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->enum('status', ['pending', 'done', 'skipped'])->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['application_id', 'status']);
            // CareLink uses job_applications.application_id and users.user_id (not Laravel defaults).
            $table->foreign('application_id')->references('application_id')->on('job_applications')->cascadeOnDelete();
            $table->foreign('created_by')->references('user_id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_tasks');
    }
};
