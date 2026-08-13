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
          bpm: number;
          beats_per_bar: number;
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
          bpm?: number;
          beats_per_bar?: number;
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
          bpm?: number;
          beats_per_bar?: number;
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
          transition_duration_seconds: number;
          time_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          order_index: number;
          transition_duration_seconds?: number;
          time_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          order_index?: number;
          transition_duration_seconds?: number;
          time_seconds?: number;
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
          dancer_transition_duration_seconds: number | null;
          curve_control_x: number | null;
          curve_control_y: number | null;
        };
        Insert: {
          scene_id: string;
          dancer_id: string;
          x_coordinate?: number;
          y_coordinate?: number;
          rotation_angle?: number;
          dancer_transition_duration_seconds?: number | null;
          curve_control_x?: number | null;
          curve_control_y?: number | null;
        };
        Update: {
          scene_id?: string;
          dancer_id?: string;
          x_coordinate?: number;
          y_coordinate?: number;
          rotation_angle?: number;
          dancer_transition_duration_seconds?: number | null;
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
       * 共有リンクで開いたときの読み取り口(migration 0007)。
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
