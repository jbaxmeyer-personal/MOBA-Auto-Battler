extends Node2D

# ─── Constants ────────────────────────────────────────────────────────────────

const MAP_SIZE        := 300
const MAP_SCALE       := 12       # map units → screen pixels
const TILE_PX         := 16       # source tile size in tileset
const TERRAIN_TILES   := 75       # 300/4 map units per tile
const TILE_MAP_UNITS  := 4        # map units per tile
const TILE_SCALE      := 3.0      # 16px tile → 48px on screen
const LANE_HALF       := 7
const SPAWN_BLUE      := Vector2(22, 278)
const SPAWN_RED       := Vector2(278, 22)
const SPRITE_SCALE    := 1.75
const TREE_SCALE      := 2.5
const TICK_INTERVAL   := 2.0      # seconds per tick (playback speed)
const HP_BAR_W        := 48
const HP_BAR_H        := 6
const TEAM_BLUE       := Color(0.31, 0.765, 0.973)
const TEAM_RED        := Color(1.0, 0.482, 0.482)

const TILE_WALL        := 0
const TILE_BASE_BLUE   := 1
const TILE_BASE_RED    := 2
const TILE_LANE        := 3
const TILE_JUNGLE      := 4
const TILE_DEEP_FOREST := 5
const TILE_CLEARING    := 6

const CHAMP_SPRITE : Dictionary = {
	"Stoneguard": "knight", "Ironbark": "orc-warrior", "Thornwall": "knight",
	"Stonewall": "knight", "Irongrasp": "orc-warrior", "Ironsong": "knight",
	"Deeproot": "orc-warrior", "Thornback": "orc",
	"Shade": "rogue", "Driftblade": "rogue", "Spiritfox": "rogue",
	"Fangwhisper": "orc-rogue", "Briarvex": "orc-rogue",
	"Emberpyre": "wizard", "Hexwing": "wizard", "Bombspore": "orc-shaman",
	"Sylvara": "wizard", "Wraithfern": "skeleton-mage",
	"Embervane": "orc-shaman", "Darkblossom": "wizard",
	"Wildshot": "skeleton", "Swiftarrow": "skeleton",
	"Starshot": "skeleton", "Vaulthorn": "skeleton",
	"Duskwarden": "orc", "Bogveil": "orc-shaman", "Iceveil": "wizard",
	"Tidecaller": "orc-shaman", "Stormhide": "orc", "Gravewarden": "skeleton-war",
}

const ROLE_FALLBACK : Dictionary = {
	"top": "knight", "jungle": "orc", "mid": "wizard",
	"adc": "skeleton", "support": "orc-shaman"
}

# ─── Match data ───────────────────────────────────────────────────────────────
var match_data : Dictionary = {}
var ticks : Array = []
var current_tick_idx : int = 0
var tick_timer : float = 0.0

# ─── Scene nodes ──────────────────────────────────────────────────────────────
var terrain_sprite : Sprite2D
var champions_node : Node2D
var trees_node : Node2D
var ui_node : CanvasLayer
var camera : Camera2D

var champ_nodes : Dictionary = {}
var sprite_textures : Dictionary = {}
var tileset_image : Image

var score_label : Label
var time_label : Label
var event_log : Label
var event_lines : Array = []

var camera_target : Vector2 = Vector2(150, 150) * MAP_SCALE

# ─── Initialisation ───────────────────────────────────────────────────────────

func _ready() -> void:
	_load_match_data()
	_build_terrain()
	_build_trees()
	_build_hud()
	_build_camera()
	_build_champions()
	_build_minimap_control()
	_apply_tick(0)

func _get_asset_base() -> String:
	return ProjectSettings.globalize_path("res://") + "../assets"

# ─── Match data ───────────────────────────────────────────────────────────────

func _load_match_data() -> void:
	var data_path : String = ""
	var args := OS.get_cmdline_args()
	for i in range(args.size() - 1):
		if args[i] == "--match-data":
			data_path = args[i + 1]
			break

	if data_path.is_empty():
		var proj_dir := ProjectSettings.globalize_path("res://")
		data_path = proj_dir + "../match_data.json"

	if FileAccess.file_exists(data_path):
		var f := FileAccess.open(data_path, FileAccess.READ)
		if f:
			var text := f.get_as_text()
			f.close()
			var parsed : Variant = JSON.parse_string(text)
			if parsed is Dictionary:
				match_data = parsed as Dictionary
				var t : Variant = match_data.get("ticks", [])
				if t is Array:
					ticks = t as Array
				return

	_generate_test_data()

func _generate_test_data() -> void:
	match_data = {
		"teams": {
			"blue": {"name": "Azure Foxes"},
			"red":  {"name": "Crimson Wolves"}
		}
	}

	var blue_names : Dictionary = {
		"top": "Ironclad", "jungle": "Phantom", "mid": "Oracle",
		"adc": "Solaris", "support": "Wraith"
	}
	var red_names : Dictionary = {
		"top": "Boulder", "jungle": "Flicker", "mid": "Noctis",
		"adc": "Vortex", "support": "Shelter"
	}
	var blue_max_hp : Dictionary = {
		"top": 550, "jungle": 480, "mid": 420, "adc": 440, "support": 500
	}
	var red_max_hp : Dictionary = {
		"top": 550, "jungle": 480, "mid": 420, "adc": 440, "support": 500
	}

	# Lane positions
	var blue_lane : Dictionary = {
		"top":     Vector2(35, 195), "jungle":  Vector2(88, 115),
		"mid":     Vector2(115, 200), "adc":    Vector2(175, 265),
		"support": Vector2(148, 265)
	}
	var red_lane : Dictionary = {
		"top":     Vector2(105, 35), "jungle":  Vector2(212, 185),
		"mid":     Vector2(185, 100), "adc":    Vector2(265, 195),
		"support": Vector2(265, 152)
	}
	var blue_fight : Dictionary = {
		"top":     Vector2(135, 155), "jungle": Vector2(145, 150),
		"mid":     Vector2(148, 152), "adc":    Vector2(152, 165),
		"support": Vector2(140, 162)
	}
	var red_fight : Dictionary = {
		"top":     Vector2(165, 145), "jungle": Vector2(155, 150),
		"mid":     Vector2(152, 148), "adc":    Vector2(158, 135),
		"support": Vector2(160, 138)
	}

	var result_ticks : Array = []
	for t in range(40):
		var bpos : Dictionary = {}
		var rpos : Dictionary = {}

		for role in ["top", "jungle", "mid", "adc", "support"]:
			var bmhp : int = blue_max_hp[role]
			var rmhp : int = red_max_hp[role]
			var bx : float
			var by : float
			var rx : float
			var ry : float
			var bhp : int = bmhp
			var rhp : int = rmhp

			if t < 10:
				var f := float(t) / 10.0
				bx = lerp(22.0, (blue_lane[role] as Vector2).x, f)
				by = lerp(278.0, (blue_lane[role] as Vector2).y, f)
				rx = lerp(278.0, (red_lane[role] as Vector2).x, f)
				ry = lerp(22.0, (red_lane[role] as Vector2).y, f)
			elif t < 20:
				bx = (blue_lane[role] as Vector2).x
				by = (blue_lane[role] as Vector2).y
				rx = (red_lane[role] as Vector2).x
				ry = (red_lane[role] as Vector2).y
			else:
				var f : float = clampf(float(t - 20) / 10.0, 0.0, 1.0)
				bx = lerp((blue_lane[role] as Vector2).x, (blue_fight[role] as Vector2).x, f)
				by = lerp((blue_lane[role] as Vector2).y, (blue_fight[role] as Vector2).y, f)
				rx = lerp((red_lane[role] as Vector2).x, (red_fight[role] as Vector2).x, f)
				ry = lerp((red_lane[role] as Vector2).y, (red_fight[role] as Vector2).y, f)
				bhp = max(50, bmhp - int(float(t - 20) * 12.0))
				rhp = max(30, rmhp - int(float(t - 20) * 10.0))

			bpos[role] = {
				"champName": blue_names[role],
				"x": int(bx), "y": int(by),
				"hp": bhp, "maxHp": bmhp, "isDead": false
			}
			rpos[role] = {
				"champName": red_names[role],
				"x": int(rx), "y": int(ry),
				"hp": rhp, "maxHp": rmhp, "isDead": false
			}

		var tick_events : Array = []
		if t == 5:
			tick_events.append({"type": "commentary", "text": "Teams heading to their lanes!"})
		elif t == 15:
			tick_events.append({"type": "commentary", "text": "Teams converging on mid-lane!"})
		elif t == 25:
			tick_events.append({"type": "kill", "text": "Oracle eliminated Noctis! First blood!"})
		elif t == 30:
			tick_events.append({"type": "kill", "text": "Boulder eliminated Phantom!"})
		elif t == 35:
			tick_events.append({"type": "objective", "text": "BLUE seized a Ley Shrine!"})

		var bk : int = 0
		var rk : int = 0
		if t >= 25: bk = 1
		if t >= 30: rk = 1

		result_ticks.append({
			"time": str(t * 2 / 60) + ":" + str(t * 2 % 60).pad_zeros(2),
			"positions": {"blue": bpos, "red": rpos},
			"events": tick_events,
			"blueKills": bk,
			"redKills": rk,
			"text": ""
		})

	ticks = result_ticks
	match_data["ticks"] = ticks

# ─── Terrain ─────────────────────────────────────────────────────────────────

func _get_tile_type(mx: float, my: float) -> int:
	if mx < 10.0 or mx > 290.0 or my < 10.0 or my > 290.0:
		return TILE_WALL
	if mx < 65.0 and my > 235.0:
		return TILE_BASE_BLUE
	if mx > 235.0 and my < 65.0:
		return TILE_BASE_RED
	var lw := float(LANE_HALF)
	if absf(my - 265.0) < lw: return TILE_LANE
	if absf(mx - 35.0)  < lw: return TILE_LANE
	if absf(my - 35.0)  < lw: return TILE_LANE
	if absf(mx - 265.0) < lw: return TILE_LANE
	if absf(mx + my - 300.0) < lw * 1.35: return TILE_LANE
	var cx1 := mx - 65.0
	var cy1 := my - 65.0
	if cx1 * cx1 + cy1 * cy1 < 600.0: return TILE_CLEARING
	var cx2 := mx - 235.0
	var cy2 := my - 235.0
	if cx2 * cx2 + cy2 * cy2 < 600.0: return TILE_CLEARING
	if _min_lane_dist(mx, my) > 60.0: return TILE_DEEP_FOREST
	return TILE_JUNGLE

func _min_lane_dist(mx: float, my: float) -> float:
	var d1 : float = absf(my - 265.0)
	var d2 : float = absf(mx - 35.0)
	var d3 : float = absf(my - 35.0)
	var d4 : float = absf(mx - 265.0)
	var d5 : float = absf(mx + my - 300.0) / 1.4142135
	var best : float = d1
	if d2 < best: best = d2
	if d3 < best: best = d3
	if d4 < best: best = d4
	if d5 < best: best = d5
	return best

func _hash_tile(x: int, y: int) -> int:
	return (x * 1234567 + y * 7654321) & 0x7FFFFFFF

func _build_terrain() -> void:
	var asset_base := _get_asset_base()
	var ts_path := asset_base + "/terrain/tileset.png"

	tileset_image = Image.new()
	var err := tileset_image.load(ts_path)
	if err != OK:
		push_error("Failed to load tileset: " + ts_path)
		tileset_image = Image.create(128, 240, false, Image.FORMAT_RGBA8)
		tileset_image.fill(Color(0.639, 0.702, 0.082))

	var terrain_img := Image.create(1200, 1200, false, Image.FORMAT_RGBA8)
	terrain_img.fill(Color(0.639, 0.702, 0.082))

	for ty in range(75):
		for tx in range(75):
			var mx : float = float(tx) * TILE_MAP_UNITS + TILE_MAP_UNITS * 0.5
			var my : float = float(ty) * TILE_MAP_UNITS + TILE_MAP_UNITS * 0.5
			var tile_type : int = _get_tile_type(mx, my)
			var h : int = _hash_tile(tx, ty)
			var src_x : int = 0
			var src_y : int = 0

			if tile_type == TILE_WALL:
				if h % 2 == 0:
					src_x = 0; src_y = 32
				else:
					src_x = 0; src_y = 16
			elif tile_type == TILE_BASE_BLUE or tile_type == TILE_BASE_RED:
				src_x = 16; src_y = 160
			elif tile_type == TILE_LANE:
				var vi : int = h % 4
				if   vi == 0: src_x = 64;  src_y = 144
				elif vi == 1: src_x = 80;  src_y = 144
				elif vi == 2: src_x = 96;  src_y = 144
				else:         src_x = 112; src_y = 144
			elif tile_type == TILE_JUNGLE:
				var vi : int = h % 9
				if   vi == 0: src_x = 0;  src_y = 0
				elif vi == 1: src_x = 16; src_y = 0
				elif vi == 2: src_x = 48; src_y = 0
				elif vi == 3: src_x = 64; src_y = 0
				elif vi == 4: src_x = 80; src_y = 0
				elif vi == 5: src_x = 16; src_y = 16
				elif vi == 6: src_x = 32; src_y = 16
				elif vi == 7: src_x = 48; src_y = 16
				else:         src_x = 64; src_y = 16
			elif tile_type == TILE_DEEP_FOREST:
				if h % 2 == 0:
					src_x = 0; src_y = 32
				else:
					src_x = 0; src_y = 16
			else:
				src_x = 0; src_y = 0  # CLEARING / fallback

			var src_rect := Rect2i(src_x, src_y, TILE_PX, TILE_PX)
			var dst_pos := Vector2i(tx * TILE_PX, ty * TILE_PX)
			terrain_img.blend_rect(tileset_image, src_rect, dst_pos)

	var terrain_tex := ImageTexture.create_from_image(terrain_img)
	terrain_sprite = Sprite2D.new()
	terrain_sprite.texture = terrain_tex
	terrain_sprite.centered = false
	terrain_sprite.scale = Vector2(TILE_SCALE, TILE_SCALE)
	terrain_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	terrain_sprite.z_index = -100
	add_child(terrain_sprite)

# ─── Trees ────────────────────────────────────────────────────────────────────

func _build_trees() -> void:
	# Trees disabled — terrain focus first
	trees_node = Node2D.new()
	add_child(trees_node)
	return

	var asset_base := _get_asset_base()
	# Collect [texture, region_x, region_y, region_w, region_h] tuples
	var variants : Array = []

	var t1_img := Image.new()
	if t1_img.load(asset_base + "/trees/tree1.png") == OK:
		var t1_tex := ImageTexture.create_from_image(t1_img)
		variants.append([t1_tex, 0, 0, 92, 128])
		variants.append([t1_tex, 92, 0, 92, 128])

	var t2_img := Image.new()
	if t2_img.load(asset_base + "/trees/tree2.png") == OK:
		var t2_tex := ImageTexture.create_from_image(t2_img)
		variants.append([t2_tex, 0, 0, 64, 112])
		variants.append([t2_tex, 64, 0, 64, 112])

	var t3_img := Image.new()
	if t3_img.load(asset_base + "/trees/tree3.png") == OK:
		var t3_tex := ImageTexture.create_from_image(t3_img)
		variants.append([t3_tex, 0, 0, 100, 208])

	var dec_img := Image.new()
	if dec_img.load(asset_base + "/terrain/decorations.png") == OK:
		var dec_tex := ImageTexture.create_from_image(dec_img)
		variants.append([dec_tex, 0,   128, 64, 100])
		variants.append([dec_tex, 64,  128, 64, 100])
		variants.append([dec_tex, 128, 128, 64, 100])

	if variants.is_empty():
		return

	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var spacing : int = 16

	var mx : int = 0
	while mx < MAP_SIZE:
		var my : int = 0
		while my < MAP_SIZE:
			var tile_type : int = _get_tile_type(float(mx), float(my))
			if tile_type == TILE_JUNGLE or tile_type == TILE_DEEP_FOREST:
				var jx : float = rng.randf_range(-4.0, 4.0)
				var jy : float = rng.randf_range(-4.0, 4.0)
				var world_x : float = (float(mx) + jx) * MAP_SCALE
				var world_y : float = (float(my) + jy) * MAP_SCALE

				var vi : int = _hash_tile(mx, my) % variants.size()
				var vdata : Array = variants[vi]
				var vtex : ImageTexture = vdata[0]
				var vr_x : int = vdata[1]
				var vr_y : int = vdata[2]
				var vr_w : int = vdata[3]
				var vr_h : int = vdata[4]

				var spr := Sprite2D.new()
				spr.texture = vtex
				spr.region_enabled = true
				spr.region_rect = Rect2(vr_x, vr_y, vr_w, vr_h)
				spr.centered = false
				var sw : float = float(vr_w) * TREE_SCALE
				var sh : float = float(vr_h) * TREE_SCALE
				spr.position = Vector2(world_x - sw * 0.5, world_y - sh)
				spr.scale = Vector2(TREE_SCALE, TREE_SCALE)
				spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
				spr.z_index = int(world_y) / 10
				trees_node.add_child(spr)
			my += spacing
		mx += spacing

# ─── HUD ─────────────────────────────────────────────────────────────────────

func _build_hud() -> void:
	ui_node = CanvasLayer.new()
	ui_node.layer = 10
	add_child(ui_node)

	# Top bar background
	var top_bg := ColorRect.new()
	top_bg.color = Color(0.0, 0.0, 0.0, 0.75)
	top_bg.size = Vector2(1280, 44)
	top_bg.position = Vector2(0, 0)
	ui_node.add_child(top_bg)

	# Blue team
	var blue_lbl := Label.new()
	blue_lbl.text = _get_team_name("blue")
	blue_lbl.position = Vector2(20, 10)
	blue_lbl.add_theme_color_override("font_color", TEAM_BLUE)
	blue_lbl.add_theme_font_size_override("font_size", 18)
	ui_node.add_child(blue_lbl)

	# Score
	score_label = Label.new()
	score_label.text = "0 — 0"
	score_label.position = Vector2(540, 8)
	score_label.size = Vector2(200, 30)
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	score_label.add_theme_color_override("font_color", Color(1, 1, 1))
	score_label.add_theme_font_size_override("font_size", 22)
	ui_node.add_child(score_label)

	# Time
	time_label = Label.new()
	time_label.text = "0:00"
	time_label.position = Vector2(590, 28)
	time_label.size = Vector2(100, 16)
	time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	time_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	time_label.add_theme_font_size_override("font_size", 12)
	ui_node.add_child(time_label)

	# Red team
	var red_lbl := Label.new()
	red_lbl.text = _get_team_name("red")
	red_lbl.position = Vector2(1060, 10)
	red_lbl.add_theme_color_override("font_color", TEAM_RED)
	red_lbl.add_theme_font_size_override("font_size", 18)
	ui_node.add_child(red_lbl)

	# Event log
	var log_bg := ColorRect.new()
	log_bg.color = Color(0.0, 0.0, 0.0, 0.65)
	log_bg.size = Vector2(500, 110)
	log_bg.position = Vector2(0, 690)
	ui_node.add_child(log_bg)

	event_log = Label.new()
	event_log.text = "Match starting..."
	event_log.position = Vector2(8, 694)
	event_log.size = Vector2(490, 106)
	event_log.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9))
	event_log.add_theme_font_size_override("font_size", 13)
	event_log.autowrap_mode = TextServer.AUTOWRAP_WORD
	ui_node.add_child(event_log)

	# Minimap background (drawn by _MinimapControl)
	var mm_bg := ColorRect.new()
	mm_bg.color = Color(0.05, 0.1, 0.05, 0.85)
	mm_bg.size = Vector2(210, 210)
	mm_bg.position = Vector2(1070, 585)
	ui_node.add_child(mm_bg)

func _get_team_name(side: String) -> String:
	var teams : Variant = match_data.get("teams", {})
	if not (teams is Dictionary):
		return side.to_upper()
	var team_dict : Dictionary = teams as Dictionary
	var team : Variant = team_dict.get(side, {})
	if not (team is Dictionary):
		return side.to_upper()
	var td : Dictionary = team as Dictionary
	var name_v : Variant = td.get("name", side.to_upper())
	if name_v is String:
		return name_v as String
	return side.to_upper()

# ─── Camera ──────────────────────────────────────────────────────────────────

func _build_camera() -> void:
	camera = Camera2D.new()
	camera.position = Vector2(150, 150) * MAP_SCALE
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 3.0
	add_child(camera)

# ─── Champions ───────────────────────────────────────────────────────────────

func _get_sprite_key(champ_name: String, role: String) -> String:
	if CHAMP_SPRITE.has(champ_name):
		var v : Variant = CHAMP_SPRITE[champ_name]
		if v is String:
			return v as String
	if ROLE_FALLBACK.has(role):
		var v : Variant = ROLE_FALLBACK[role]
		if v is String:
			return v as String
	return "knight"

func _load_sprite_frames(sprite_key: String) -> SpriteFrames:
	if sprite_textures.has(sprite_key):
		return sprite_textures[sprite_key] as SpriteFrames

	var asset_base := _get_asset_base()
	var sprite_dir := asset_base + "/sprites/"
	var frames := SpriteFrames.new()
	frames.remove_animation("default")

	# Idle animation
	var idle_img := Image.new()
	if idle_img.load(sprite_dir + sprite_key + "-idle.png") == OK:
		var idle_tex := ImageTexture.create_from_image(idle_img)
		frames.add_animation("idle")
		frames.set_animation_loop("idle", true)
		frames.set_animation_speed("idle", 6.0)
		for i in range(4):
			var atlas := AtlasTexture.new()
			atlas.atlas = idle_tex
			atlas.region = Rect2(i * 32, 0, 32, 32)
			frames.add_frame("idle", atlas)
	else:
		frames.add_animation("idle")
		frames.set_animation_loop("idle", true)
		frames.set_animation_speed("idle", 6.0)
		var ph_img := Image.create(32, 32, false, Image.FORMAT_RGBA8)
		var ph_col : Color
		if "wizard" in sprite_key:
			ph_col = Color(0.4, 0.4, 0.9)
		else:
			ph_col = Color(0.6, 0.4, 0.2)
		ph_img.fill(ph_col)
		var ph_tex := ImageTexture.create_from_image(ph_img)
		frames.add_frame("idle", ph_tex)

	# Run animation — left/right only (run_right + flip scale.x for left)
	# Row 1 (y=32) of the run sheet: cols 0-5=walk_left, cols 6-11=walk_right
	var run_img := Image.new()
	if run_img.load(sprite_dir + sprite_key + "-run.png") == OK:
		var run_tex := ImageTexture.create_from_image(run_img)
		frames.add_animation("run_right")
		frames.set_animation_loop("run_right", true)
		frames.set_animation_speed("run_right", 10.0)
		for i in range(6):
			var atlas := AtlasTexture.new()
			atlas.atlas = run_tex
			atlas.region = Rect2((i + 6) * 32, 32, 32, 32)
			frames.add_frame("run_right", atlas)
	else:
		frames.add_animation("run_right")
		frames.set_animation_loop("run_right", true)
		frames.set_animation_speed("run_right", 6.0)
		var n := frames.get_frame_count("idle")
		for fi in range(n):
			frames.add_frame("run_right", frames.get_frame_texture("idle", fi))

	# Death animation (optional)
	var death_img := Image.new()
	if death_img.load(sprite_dir + sprite_key + "-death.png") == OK:
		var death_tex := ImageTexture.create_from_image(death_img)
		var nf : int = death_img.get_width() / 32
		frames.add_animation("death")
		frames.set_animation_loop("death", false)
		frames.set_animation_speed("death", 6.0)
		for i in range(nf):
			var atlas := AtlasTexture.new()
			atlas.atlas = death_tex
			atlas.region = Rect2(i * 32, 0, 32, 32)
			frames.add_frame("death", atlas)

	sprite_textures[sprite_key] = frames
	return frames

func _build_champions() -> void:
	champions_node = Node2D.new()
	champions_node.z_index = 10
	add_child(champions_node)

	if ticks.is_empty():
		return

	var first_tick : Variant = ticks[0]
	if not (first_tick is Dictionary):
		return
	var first_dict : Dictionary = first_tick as Dictionary
	var positions_v : Variant = first_dict.get("positions", {})
	if not (positions_v is Dictionary):
		return
	var positions : Dictionary = positions_v as Dictionary

	for side in ["blue", "red"]:
		var side_v : Variant = positions.get(side, {})
		if not (side_v is Dictionary):
			continue
		var side_pos : Dictionary = side_v as Dictionary
		for role in side_pos.keys():
			var cd_v : Variant = side_pos[role]
			if not (cd_v is Dictionary):
				continue
			_create_champion_node(side, role as String, cd_v as Dictionary)

func _create_champion_node(side: String, role: String, champ_data: Dictionary) -> void:
	var champ_name_v : Variant = champ_data.get("champName", role)
	var champ_name : String = champ_name_v as String if champ_name_v is String else role
	var sprite_key := _get_sprite_key(champ_name, role)
	var sprite_frames := _load_sprite_frames(sprite_key)

	var node := Node2D.new()
	node.name = side + "_" + role

	# Sprite
	var sprite := AnimatedSprite2D.new()
	sprite.sprite_frames = sprite_frames
	sprite.scale = Vector2(SPRITE_SCALE, SPRITE_SCALE)
	sprite.offset = Vector2(0, -16)
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	sprite.play("idle")
	node.add_child(sprite)

	# Team circle
	var circle_img := Image.create(20, 20, false, Image.FORMAT_RGBA8)
	var tcol : Color = TEAM_BLUE if side == "blue" else TEAM_RED
	for py in range(20):
		for px in range(20):
			var ddx : float = float(px) - 10.0
			var ddy : float = float(py) - 10.0
			if ddx * ddx + ddy * ddy <= 100.0:
				circle_img.set_pixel(px, py, tcol)
	var circle_tex := ImageTexture.create_from_image(circle_img)
	var circle_spr := Sprite2D.new()
	circle_spr.texture = circle_tex
	circle_spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	circle_spr.z_index = -1
	node.add_child(circle_spr)

	# HP bar background
	var hp_bg := ColorRect.new()
	hp_bg.size = Vector2(HP_BAR_W, HP_BAR_H)
	hp_bg.position = Vector2(-HP_BAR_W / 2.0, -62.0)
	hp_bg.color = Color(0.2, 0.05, 0.05)
	node.add_child(hp_bg)

	# HP bar fill
	var hp_fill := ColorRect.new()
	hp_fill.size = Vector2(HP_BAR_W, HP_BAR_H)
	hp_fill.position = Vector2(-HP_BAR_W / 2.0, -62.0)
	hp_fill.color = Color(0.1, 0.85, 0.1)
	hp_fill.name = "HPFill"
	node.add_child(hp_fill)

	# Name label
	var name_lbl := Label.new()
	name_lbl.text = champ_name
	name_lbl.add_theme_font_size_override("font_size", 9)
	name_lbl.add_theme_color_override("font_color", TEAM_BLUE if side == "blue" else TEAM_RED)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.size = Vector2(80, 14)
	name_lbl.position = Vector2(-40, -76.0)
	node.add_child(name_lbl)

	# Initial position
	var ix_v : Variant = champ_data.get("x", 150)
	var iy_v : Variant = champ_data.get("y", 150)
	var ix : float = float(ix_v) if ix_v is int or ix_v is float else 150.0
	var iy : float = float(iy_v) if iy_v is int or iy_v is float else 150.0
	var mhp_v : Variant = champ_data.get("maxHp", 420)
	var mhp : float = float(mhp_v) if mhp_v is int or mhp_v is float else 420.0

	node.position = Vector2(ix * MAP_SCALE, iy * MAP_SCALE)
	node.set_meta("sprite", sprite)
	node.set_meta("hp_fill", hp_fill)
	node.set_meta("max_hp", mhp)
	node.set_meta("prev_x", ix)
	node.set_meta("prev_y", iy)
	node.set_meta("next_x", ix)
	node.set_meta("next_y", iy)

	champions_node.add_child(node)
	champ_nodes[side + "_" + role] = node

# ─── Main loop ───────────────────────────────────────────────────────────────

func _process(delta: float) -> void:
	if ticks.is_empty():
		return

	tick_timer += delta
	if tick_timer >= TICK_INTERVAL:
		tick_timer -= TICK_INTERVAL
		current_tick_idx = mini(current_tick_idx + 1, ticks.size() - 1)
		_apply_tick(current_tick_idx)

	var interp_t : float = tick_timer / TICK_INTERVAL
	_interpolate_champions(interp_t)
	_update_camera(delta)

func _apply_tick(idx: int) -> void:
	if ticks.is_empty() or idx >= ticks.size():
		return

	var tick_v : Variant = ticks[idx]
	if not (tick_v is Dictionary):
		return
	var tick_data : Dictionary = tick_v as Dictionary
	var positions_v : Variant = tick_data.get("positions", {})
	if not (positions_v is Dictionary):
		return
	var positions : Dictionary = positions_v as Dictionary

	for side in ["blue", "red"]:
		var side_v : Variant = positions.get(side, {})
		if not (side_v is Dictionary):
			continue
		var side_pos : Dictionary = side_v as Dictionary
		for role_v in side_pos.keys():
			var role : String = role_v as String
			var key : String = side + "_" + role
			var cd_v : Variant = side_pos[role]
			if not (cd_v is Dictionary):
				continue
			var champ_data : Dictionary = cd_v as Dictionary

			if not champ_nodes.has(key):
				_create_champion_node(side, role, champ_data)

			var node : Node2D = champ_nodes[key] as Node2D

			# Store prev/next for interpolation
			var prev_x : float = node.get_meta("next_x", 150.0) as float
			var prev_y : float = node.get_meta("next_y", 150.0) as float
			node.set_meta("prev_x", prev_x)
			node.set_meta("prev_y", prev_y)

			var nx_v : Variant = champ_data.get("x", 150)
			var ny_v : Variant = champ_data.get("y", 150)
			var nx : float = float(nx_v) if nx_v is int or nx_v is float else 150.0
			var ny_ : float = float(ny_v) if ny_v is int or ny_v is float else 150.0
			node.set_meta("next_x", nx)
			node.set_meta("next_y", ny_)

			# HP bar
			var hp_v : Variant = champ_data.get("hp", 420)
			var mhp_v : Variant = champ_data.get("maxHp", node.get_meta("max_hp", 420.0))
			var hp : float = float(hp_v) if hp_v is int or hp_v is float else 420.0
			var mhp : float = float(mhp_v) if mhp_v is int or mhp_v is float else 420.0
			var hp_fill : ColorRect = node.get_meta("hp_fill") as ColorRect
			var pct : float = clamp(hp / mhp, 0.0, 1.0) if mhp > 0.0 else 0.0
			hp_fill.size.x = HP_BAR_W * pct
			if pct > 0.5:
				hp_fill.color = Color(0.1, 0.85, 0.1)
			elif pct > 0.25:
				hp_fill.color = Color(0.9, 0.7, 0.1)
			else:
				hp_fill.color = Color(0.9, 0.2, 0.1)

			# Visibility / animation direction
			var dead_v : Variant = champ_data.get("isDead", false)
			var is_dead : bool = bool(dead_v) if dead_v is bool else false
			node.visible = not is_dead

			var sprite : AnimatedSprite2D = node.get_meta("sprite") as AnimatedSprite2D
			if not is_dead:
				var dx : float = nx - prev_x
				var dy : float = ny_ - prev_y
				var is_moving : bool = (absf(dx) + absf(dy)) > 1.5
				if is_moving:
					# Left/right only — use horizontal component primarily,
					# fall back to direction of travel if mostly vertical
					var face_right : bool = dx >= 0.0
					sprite.scale.x = absf(sprite.scale.x) * (1.0 if face_right else -1.0)
					if sprite.animation != "run_right":
						sprite.play("run_right")
				else:
					if sprite.animation != "idle":
						sprite.play("idle")

	# HUD update
	_update_hud(tick_data)

	# Events
	var events_v : Variant = tick_data.get("events", [])
	if events_v is Array:
		var ev_arr : Array = events_v as Array
		for ev in ev_arr:
			if ev is Dictionary:
				var ev_dict : Dictionary = ev as Dictionary
				var txt_v : Variant = ev_dict.get("text", "")
				if txt_v is String:
					var txt : String = txt_v as String
					if not txt.is_empty():
						event_lines.append(txt)
						if event_lines.size() > 5:
							event_lines.remove_at(0)
	if event_log:
		event_log.text = "\n".join(event_lines)

func _interpolate_champions(t: float) -> void:
	for key_v in champ_nodes.keys():
		var key : String = key_v as String
		var node : Node2D = champ_nodes[key] as Node2D
		if not node.visible:
			continue
		var px : float = node.get_meta("prev_x", 150.0) as float
		var py : float = node.get_meta("prev_y", 150.0) as float
		var nx : float = node.get_meta("next_x", 150.0) as float
		var ny_ : float = node.get_meta("next_y", 150.0) as float
		var wx : float = lerp(px, nx, t) * MAP_SCALE
		var wy : float = lerp(py, ny_, t) * MAP_SCALE
		node.position = Vector2(wx, wy)
		node.z_index = 10 + int(wy) / 10

func _update_hud(tick_data: Dictionary) -> void:
	var bk_v : Variant = tick_data.get("blueKills", 0)
	var rk_v : Variant = tick_data.get("redKills", 0)
	var bk : int = int(bk_v) if bk_v is int or bk_v is float else 0
	var rk : int = int(rk_v) if rk_v is int or rk_v is float else 0
	if score_label:
		score_label.text = str(bk) + " — " + str(rk)

	var time_v : Variant = tick_data.get("time", "0:00")
	if time_label:
		if time_v is String:
			time_label.text = time_v as String
		elif time_v is int or time_v is float:
			var ts : int = int(time_v)
			time_label.text = str(ts / 60) + ":" + str(ts % 60).pad_zeros(2)

func _update_camera(delta: float) -> void:
	var sum := Vector2.ZERO
	var count : int = 0
	for key_v in champ_nodes.keys():
		var key : String = key_v as String
		var node : Node2D = champ_nodes[key] as Node2D
		if node.visible:
			sum += node.position
			count += 1

	if count > 0:
		var centroid : Vector2 = sum / float(count)
		camera_target = camera_target.lerp(centroid, 0.15)

	var map_w : float = MAP_SIZE * MAP_SCALE
	var map_h : float = MAP_SIZE * MAP_SCALE
	camera_target.x = clampf(camera_target.x, 640.0, map_w - 640.0)
	camera_target.y = clampf(camera_target.y, 400.0, map_h - 400.0)
	camera.position = camera.position.lerp(camera_target, 3.0 * delta)

# ─── Minimap ─────────────────────────────────────────────────────────────────

var minimap_ctrl : Control

func _build_minimap_control() -> void:
	minimap_ctrl = _MinimapControl.new()
	minimap_ctrl.main_ref = self
	minimap_ctrl.position = Vector2(1070, 585)
	minimap_ctrl.size = Vector2(210, 210)
	ui_node.add_child(minimap_ctrl)

class _MinimapControl extends Control:
	var main_ref : Node

	func _draw() -> void:
		draw_rect(Rect2(0, 0, 210, 210), Color(0.08, 0.12, 0.08, 0.92))
		if not main_ref:
			return

		var scx : float = 210.0 / 300.0
		var scy : float = 210.0 / 300.0
		var lane_col := Color(0.55, 0.45, 0.3, 0.7)

		# Lane lines
		draw_line(Vector2(0.0, 265.0 * scy), Vector2(210.0, 265.0 * scy), lane_col, 2.0)
		draw_line(Vector2(35.0 * scx, 0.0), Vector2(35.0 * scx, 210.0), lane_col, 2.0)
		draw_line(Vector2(0.0, 35.0 * scy), Vector2(210.0, 35.0 * scy), lane_col, 2.0)
		draw_line(Vector2(265.0 * scx, 0.0), Vector2(265.0 * scx, 210.0), lane_col, 2.0)
		draw_line(Vector2(0.0, 300.0 * scy), Vector2(300.0 * scx, 0.0), lane_col, 2.0)

		# Base zones
		draw_rect(Rect2(0.0, 235.0 * scy, 65.0 * scx, 210.0 - 235.0 * scy), Color(0.2, 0.4, 0.8, 0.3))
		draw_rect(Rect2(235.0 * scx, 0.0, 210.0 - 235.0 * scx, 65.0 * scy), Color(0.8, 0.2, 0.2, 0.3))

		# Champion dots
		var nodes_dict : Dictionary = main_ref.champ_nodes
		for key_v in nodes_dict.keys():
			var key : String = key_v as String
			var node : Node2D = nodes_dict[key] as Node2D
			if not node.visible:
				continue
			var ms : int = main_ref.MAP_SCALE
			var wx : float = node.position.x / float(ms)
			var wy : float = node.position.y / float(ms)
			var dot_col : Color = main_ref.TEAM_BLUE if key.begins_with("blue") else main_ref.TEAM_RED
			draw_circle(Vector2(wx * scx, wy * scy), 4.5, dot_col)
			# White border
			draw_circle(Vector2(wx * scx, wy * scy), 4.5, Color(1, 1, 1, 0.5), false, 1.0)

	func _process(_delta: float) -> void:
		queue_redraw()
