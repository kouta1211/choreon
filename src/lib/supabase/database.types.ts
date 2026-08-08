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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          stage_width?: number;
          stage_height?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          stage_width?: number;
          stage_height?: number;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          order_index: number;
          transition_duration_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          order_index?: number;
          transition_duration_seconds?: number;
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
