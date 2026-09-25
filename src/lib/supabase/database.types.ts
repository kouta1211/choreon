// 暫定的に supabase/schema.sql を手で写した型定義。
// 実際のSupabaseプロジェクトに接続できたら
// `supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`
// で生成される内容に置き換える(そちらが正式なソース・オブ・トゥルースになる)。

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          stage_width: number;
          stage_height: number;
          music_offset_seconds: number;
          music_title: string | null;
          /** 共有するときだけ置く音源の道。null = サーバーには無い */
          music_path: string | null;
          bpm: number;
          beats_per_bar: number;
          is_metronome_enabled: boolean;
          /** 拍→秒の写像。[{fromBeat, atSeconds, secondsPerBeat}, ...]。
           * 読むときは必ず normalizePlacements(placement.ts) を通す —
           * jsonb なので DB は中身を守らない */
          music_placements: unknown;
          /** 共有リンクの合鍵。持ち主だけが読める(RLSで自分の行しか見えない) */
          share_token: string;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          stage_width?: number;
          stage_height?: number;
          music_offset_seconds?: number;
          music_title?: string | null;
          music_path?: string | null;
          bpm?: number;
          beats_per_bar?: number;
          is_metronome_enabled?: boolean;
          music_placements?: unknown;
          share_token?: string;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          stage_width?: number;
          stage_height?: number;
          music_offset_seconds?: number;
          music_title?: string | null;
          music_path?: string | null;
          bpm?: number;
          beats_per_bar?: number;
          is_metronome_enabled?: boolean;
          music_placements?: unknown;
          share_token?: string;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dancers: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          initial_direction: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          initial_direction?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          color?: string;
          initial_direction?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dancers_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      scenes: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          order_index: number;
          time_seconds: number;
          move_seconds: number | null;
          /** **新しい正**。頭から何拍目か(8拍=1セット)。
           * 上の秒の2列は移行の間だけ両方へ書いている(dual write) */
          position_beats: number | null;
          /** 区間のうち動くのに使う拍数。null なら区間まるごと */
          move_beats: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          order_index: number;
          time_seconds?: number;
          move_seconds?: number | null;
          position_beats?: number | null;
          move_beats?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          order_index?: number;
          time_seconds?: number;
          move_seconds?: number | null;
          position_beats?: number | null;
          move_beats?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      positions: {
        Row: {
          scene_id: string;
          dancer_id: string;
          x_coordinate: number;
          y_coordinate: number;
          rotation_angle: number;
          curve_control_x: number | null;
          curve_control_y: number | null;
        };
        Insert: {
          scene_id: string;
          dancer_id: string;
          x_coordinate?: number;
          y_coordinate?: number;
          rotation_angle?: number;
          curve_control_x?: number | null;
          curve_control_y?: number | null;
        };
        Update: {
          scene_id?: string;
          dancer_id?: string;
          x_coordinate?: number;
          y_coordinate?: number;
          rotation_angle?: number;
          curve_control_x?: number | null;
          curve_control_y?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "positions_scene_id_fkey";
            columns: ["scene_id"];
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "positions_dancer_id_fkey";
            columns: ["dancer_id"];
            referencedRelation: "dancers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /**
       * 共有リンクで開いたときの読み取り口(schema.sql)。
       * テーブルは持ち主にしか開いていないので、リンクで来た人は
       * この関数だけを通る。トークンが合わない・共有がオフなら null。
       */
      shared_project: {
        Args: { token: string };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
