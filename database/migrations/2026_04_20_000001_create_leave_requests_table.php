<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('leave_requests')) {
            Schema::create('leave_requests', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('application_id');
                $table->unsignedInteger('helper_id');
                $table->date('date');
                $table->string('reason', 500)->nullable();
                $table->enum('status', ['pending', 'approved', 'declined'])->default('pending');
                $table->dateTime('responded_at')->nullable();
                $table->timestamps();

                $table->index(['application_id', 'date']);
                $table->index(['application_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
