<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Resource;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Saving the business configuration.
 *
 * This file exists because it did not, and a bug walked straight through the
 * hole: `business_hours` is keyed on (org_id, weekday) with no surrogate id,
 * Eloquent builds its UPDATE from a single primary key, and so every
 * opening-hours change reported 204 and changed nothing. The screen said
 * "saved", the API agreed, and the row did not move.
 *
 * A write endpoint with no test is a write endpoint that can lie about
 * having worked.
 */
class CatalogWriteTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $operator;
    private Service $service;
    private Resource $roomOne;
    private Resource $roomTwo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::create([
            'name' => 'Test Clinic', 'slug' => 'test', 'timezone' => 'Asia/Riyadh', 'currency' => 'SAR',
        ]);

        $this->operator = new User();
        $this->operator->fill(['name' => 'Op', 'email' => 'op@example.com', 'password' => 'password']);
        $this->operator->org_id = $this->org->id;
        $this->operator->role = 'operator';
        $this->operator->save();

        $this->roomOne = Resource::create(['id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Room 1']);
        $this->roomTwo = Resource::create(['id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Room 2']);

        $this->service = Service::create([
            'id' => (string) Str::uuid(), 'org_id' => $this->org->id, 'name' => 'Consultation',
            'duration_min' => 30, 'buffer_min' => 10, 'price_minor' => 15000,
        ]);
        $this->service->resources()->sync([$this->roomOne->id]);

        for ($weekday = 0; $weekday <= 6; $weekday++) {
            DB::table('business_hours')->insert([
                'org_id' => $this->org->id, 'weekday' => $weekday,
                'open_time' => '09:00', 'close_time' => '18:00', 'is_closed' => false,
            ]);
        }
    }

    /** The current catalog, as the client would read it before editing. */
    private function snapshot(): array
    {
        return $this->actingAs($this->operator, 'sanctum')->getJson('/api/catalog')->json();
    }

    private function save(array $catalog)
    {
        return $this->actingAs($this->operator, 'sanctum')->putJson('/api/catalog', $catalog);
    }

    public function test_a_service_edit_is_stored(): void
    {
        $catalog = $this->snapshot();
        $catalog['services'][0]['name'] = 'استشارة معدّلة';
        $catalog['services'][0]['priceMinor'] = 22000;
        $catalog['services'][0]['durationMin'] = 45;

        $this->save($catalog)->assertNoContent();

        $fresh = $this->snapshot()['services'][0];
        $this->assertSame('استشارة معدّلة', $fresh['name']);
        $this->assertSame(22000, $fresh['priceMinor']);
        $this->assertSame(45, $fresh['durationMin']);
    }

    public function test_opening_hours_are_stored(): void
    {
        // The one that was broken. Both fields, because they failed together
        // and would have passed together for the wrong reason.
        $catalog = $this->snapshot();
        $catalog['businessHours'][0]['open'] = '08:30';
        $catalog['businessHours'][0]['close'] = '16:45';
        $catalog['businessHours'][2]['isClosed'] = true;

        $this->save($catalog)->assertNoContent();

        $fresh = $this->snapshot()['businessHours'];
        $this->assertSame('08:30', $fresh[0]['open']);
        $this->assertSame('16:45', $fresh[0]['close']);
        $this->assertTrue($fresh[2]['isClosed']);
        // And the days nobody touched are still where they were.
        $this->assertSame('09:00', $fresh[1]['open']);
    }

    public function test_a_resource_can_be_renamed_and_deactivated(): void
    {
        $catalog = $this->snapshot();
        $catalog['resources'][0]['name'] = 'غرفة الاستشارات';
        $catalog['resources'][1]['isActive'] = false;

        $this->save($catalog)->assertNoContent();

        $this->assertSame('غرفة الاستشارات', Resource::find($this->roomOne->id)->name);
        $this->assertFalse(Resource::find($this->roomTwo->id)->is_active);
    }

    public function test_the_resources_a_service_is_offered_on_can_be_replaced(): void
    {
        $catalog = $this->snapshot();
        $catalog['services'][0]['resourceIds'] = [$this->roomTwo->id];

        $this->save($catalog)->assertNoContent();

        // A set, not a row to patch: unchecking a resource has to actually
        // remove the link, or the slot grid keeps offering a room the service
        // is no longer delivered in.
        $this->assertSame([$this->roomTwo->id], $this->snapshot()['services'][0]['resourceIds']);
    }

    public function test_a_new_service_can_be_added(): void
    {
        $catalog = $this->snapshot();
        $catalog['services'][] = [
            'id' => (string) Str::uuid(),
            'name' => 'خدمة جديدة',
            'description' => '',
            'durationMin' => 60,
            'bufferMin' => 0,
            'priceMinor' => 5000,
            'resourceIds' => [$this->roomOne->id],
            'iconKey' => 'Sparkles',
            'isActive' => true,
        ];

        $this->save($catalog)->assertNoContent();

        $this->assertCount(2, $this->snapshot()['services']);
    }

    public function test_a_deactivated_service_survives_as_a_row(): void
    {
        // Services are deactivated, never deleted: existing bookings reference
        // them, and a booking whose service vanished cannot render.
        $catalog = $this->snapshot();
        $catalog['services'][0]['isActive'] = false;

        $this->save($catalog)->assertNoContent();

        $this->assertFalse(Service::find($this->service->id)->is_active);
        $this->assertCount(1, $this->snapshot()['services']);
    }

    public function test_an_invalid_catalog_is_refused_whole(): void
    {
        $catalog = $this->snapshot();
        $catalog['services'][0]['name'] = 'يجب ألا يُحفظ';
        $catalog['services'][0]['durationMin'] = 0;   // the floor is 1

        $this->save($catalog)->assertStatus(422);

        // Validation runs before the transaction, so nothing landed — a
        // half-applied catalog is worse than a rejected one, because nothing
        // tells anyone it happened.
        $this->assertSame('Consultation', Service::find($this->service->id)->name);
    }
}
