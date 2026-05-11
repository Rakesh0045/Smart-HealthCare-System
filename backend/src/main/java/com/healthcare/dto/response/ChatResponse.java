package com.healthcare.dto.response;

import lombok.*;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ChatResponse {
    private String reply;
    private List<Citation> citations;
    private List<SuggestedAction> suggestedActions;
    private String confidence;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Citation {
        private String type;
        private Long id;
        private String snippet;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SuggestedAction {
        private String type;
        private String label;
        private Object data;
    }
}
