<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('helper_id');
            $table->date('date');
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('checked_out_at')->nullable();
            $table->enum('status', ['present', 'absent', 'leave', 'holiday'])->default('present');
            $table->string('note', 500)->nullable();
            $table->timestamps();

            $table->unique(['application_id', 'date']);
            $table->foreign('application_id')->references('application_id')->on('job_applications')->cascadeOnDelete();
            $table->foreign('helper_id')->references('user_id')->on('users')->cascadeOnDelete();
        });

        if (Schema::hasTable('contracts') && !Schema::hasColumn('contracts', 'rest_day')) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->string('rest_day', 64)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('contracts') && Schema::hasColumn('contracts', 'rest_day')) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->dropColumn('rest_day');
            });
        }
        Schema::dropIfExists('attendance_logs');
    }
};
